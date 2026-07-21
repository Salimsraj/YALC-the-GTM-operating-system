/**
 * Notion workspace adapter — Phase 1 / C3.
 *
 * Bridges a Notion workspace into a tenant's memory layer. Config lives in
 * `~/.gtm-os/tenants/<slug>/adapters.yaml` with the shape:
 *
 *   adapters:
 *     - id: notion-workspace
 *       enabled: true
 *       databases:
 *         - id: "abc123..."
 *           name: "ICP Definition"
 *           role: "icp"
 *         - id: "def456..."
 *           name: "Win/Loss Analysis"
 *           role: "learnings"
 *
 * sync() queries each database, converts pages to markdown, chunks them,
 * and upserts via MemoryStore.upsertNodeBySourceHash. Notion has no
 * built-in hash matching, so we compute one from page ID + content.
 *
 * watch() would use Notion webhooks but that requires setup at the
 * workspace level; for now, sync is one-shot and can be called via cron.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import yaml from 'js-yaml'
import { tenantConfigDir } from '../../tenant/index.js'
import { MemoryStore } from '../../memory/store.js'
import { chunkMarkdown, approximateTokens } from '../../memory/chunker.js'
import { NotionService } from '../../services/notion.js'
import type { ContextAdapter, SyncResult, UnsubscribeFn } from './types.js'

interface NotionDatabaseConfig {
  id: string
  name: string
  role?: string // e.g., 'icp', 'learnings', 'campaigns'
}

interface NotionWorkspaceConfig {
  enabled?: boolean
  databases: NotionDatabaseConfig[]
}

function loadAdaptersYaml(tenantId: string): NotionWorkspaceConfig | null {
  const path = join(tenantConfigDir(tenantId), 'adapters.yaml')
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = yaml.load(raw) as
      | { adapters?: Array<{ id: string } & NotionWorkspaceConfig> }
      | null
    const list = parsed?.adapters ?? []
    const entry = list.find((a) => a.id === 'notion-workspace')
    if (!entry) return null
    if (entry.enabled === false) return null
    if (!Array.isArray(entry.databases) || entry.databases.length === 0) return null
    return { databases: entry.databases }
  } catch {
    return null
  }
}

async function pageToMarkdown(page: Record<string, unknown>): Promise<string> {
  const props = (page.properties as Record<string, unknown>) || {}
  const title = extractTextProperty(props, 'title') || extractTextProperty(props, 'Name') || 'Untitled'

  const lines: string[] = [`# ${title}`]

  // Add any key properties as metadata
  for (const [key, val] of Object.entries(props)) {
    if (key === 'title' || key === 'Name') continue
    const text = extractTextProperty(props, key)
    if (text) {
      lines.push(`**${key}:** ${text}`)
    }
  }

  lines.push('') // Blank line before content
  return lines.join('\n')
}

function extractTextProperty(props: Record<string, unknown>, key: string): string {
  const prop = props[key]
  if (!prop) return ''
  if (typeof prop === 'string') return prop
  if (prop && typeof prop === 'object') {
    const p = prop as Record<string, unknown>
    if (Array.isArray(p.title)) {
      const titles = p.title as Array<{ text?: { content?: string } }>
      return titles.map((t) => t.text?.content || '').join('')
    }
    if (Array.isArray(p.rich_text)) {
      const texts = p.rich_text as Array<{ text?: { content?: string } }>
      return texts.map((t) => t.text?.content || '').join('')
    }
    if (p.select && typeof p.select === 'object') {
      return (p.select as { name?: string }).name || ''
    }
    if (p.email) return String(p.email)
    if (p.phone_number) return String(p.phone_number)
  }
  return ''
}

function hashPageContent(pageId: string, content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${pageId}:${normalized}`).digest('hex')
}

async function syncOnce(tenantId: string, cfg: NotionWorkspaceConfig): Promise<SyncResult> {
  const store = new MemoryStore(tenantId)
  const service = new NotionService()

  let added = 0
  let unchanged = 0

  for (const dbConfig of cfg.databases) {
    try {
      // Query Notion database
      const pages = await service.queryDatabase(dbConfig.id)
      if (!Array.isArray(pages)) continue

      for (const page of pages) {
        const pageId = (page as { id?: string }).id || ''
        if (!pageId) continue

        // Convert page to markdown
        const markdown = await pageToMarkdown(page as Record<string, unknown>)
        const sourceHash = hashPageContent(pageId, markdown)
        const sourceRef = `notion-workspace://${dbConfig.id}/${pageId}`

        // Chunk markdown
        const chunks = chunkMarkdown(markdown)
        for (const chunk of chunks) {
          const result = await store.upsertNodeBySourceHash({
            type: 'document_chunk',
            content: chunk.content,
            sourceType: 'notion-workspace',
            sourceRef: `${sourceRef}#${chunk.headingPath.join('/')}:${chunk.startLine}`,
            sourceHash: chunk.sourceHash,
            metadata: {
              databaseId: dbConfig.id,
              databaseName: dbConfig.name,
              databaseRole: dbConfig.role,
              pageId,
              headingPath: chunk.headingPath,
              approxTokens: chunk.approxTokens,
            },
          })
          if (result.inserted) added++
          else unchanged++
        }
      }
    } catch (err) {
      // Log but don't fail — one database error shouldn't stop the others
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[notion-workspace] Database ${dbConfig.name} (${dbConfig.id}) sync error: ${msg}`)
    }
  }

  return { added, updated: 0, removed: 0, unchanged }
}

export const notionWorkspaceAdapter: ContextAdapter = {
  id: 'notion-workspace',

  isAvailable(tenantId: string): boolean {
    const cfg = loadAdaptersYaml(tenantId)
    if (!cfg) return false
    // Check if Notion API key is configured
    const service = new NotionService()
    return service.isAvailable()
  },

  async sync(tenantId: string): Promise<SyncResult> {
    const cfg = loadAdaptersYaml(tenantId)
    if (!cfg) {
      return { added: 0, updated: 0, removed: 0, unchanged: 0 }
    }
    return syncOnce(tenantId, cfg)
  },

  async watch(_tenantId: string): Promise<UnsubscribeFn> {
    // Notion webhooks are optional for future enhancement
    // For now, sync is one-shot and can be called via cron
    return () => {}
  },
}
