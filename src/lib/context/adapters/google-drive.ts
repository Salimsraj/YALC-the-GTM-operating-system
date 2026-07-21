/**
 * Google Drive adapter — Phase 1 / C4.
 *
 * Bridges Google Drive folders and files into a tenant's memory layer. Config
 * lives in `~/.gtm-os/tenants/<slug>/adapters.yaml` with the shape:
 *
 *   adapters:
 *     - id: google-drive
 *       enabled: true
 *       folders:
 *         - id: "folder_id_123"
 *           name: "Competitor Research"
 *           role: "research"
 *           mimeTypes:
 *             - "application/vnd.google-apps.document"
 *
 * sync() queries Google Drive API for files, downloads them, extracts text,
 * chunks, and upserts via MemoryStore.
 *
 * Future: watch() can use Google Drive push notifications.
 *
 * Note: Requires GOOGLE_DRIVE_CREDENTIALS env var (OAuth 2.0 credentials JSON).
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import yaml from 'js-yaml'
import { tenantConfigDir } from '../../tenant/index.js'
import { MemoryStore } from '../../memory/store.js'
import { chunkMarkdown } from '../../memory/chunker.js'
import type { ContextAdapter, SyncResult, UnsubscribeFn } from './types.js'

interface GoogleDriveFolderConfig {
  id: string
  name: string
  role?: string
  mimeTypes?: string[] // e.g., application/vnd.google-apps.document
}

interface GoogleDriveConfig {
  enabled?: boolean
  folders: GoogleDriveFolderConfig[]
}

function loadAdaptersYaml(tenantId: string): GoogleDriveConfig | null {
  const path = join(tenantConfigDir(tenantId), 'adapters.yaml')
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = yaml.load(raw) as
      | { adapters?: Array<{ id: string } & GoogleDriveConfig> }
      | null
    const list = parsed?.adapters ?? []
    const entry = list.find((a) => a.id === 'google-drive')
    if (!entry) return null
    if (entry.enabled === false) return null
    if (!Array.isArray(entry.folders) || entry.folders.length === 0) return null
    return { folders: entry.folders }
  } catch {
    return null
  }
}

function isGoogleDriveConfigured(): boolean {
  // Check for Google Drive credentials in environment
  const creds = process.env.GOOGLE_DRIVE_CREDENTIALS
  return !!creds && creds.length > 0
}

function hashFileContent(fileId: string, content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${fileId}:${normalized}`).digest('hex')
}

async function syncOnce(tenantId: string, cfg: GoogleDriveConfig): Promise<SyncResult> {
  const store = new MemoryStore(tenantId)

  // TODO: Implement Google Drive API integration
  // For now, this is a stub that returns success with 0 items synced.
  // The actual implementation would:
  // 1. Initialize Google Drive API client
  // 2. Query each folder for files
  // 3. Download and extract text from each file
  // 4. Chunk the text
  // 5. Upsert to memory store

  let added = 0
  let unchanged = 0

  for (const folderConfig of cfg.folders) {
    try {
      // Placeholder: would query Google Drive API here
      // For now, log that we would have synced this folder
      console.log(
        `[google-drive] Would sync folder: ${folderConfig.name} (${folderConfig.id}) with role ${folderConfig.role || 'general'}`,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[google-drive] Folder ${folderConfig.name} (${folderConfig.id}) sync error: ${msg}`)
    }
  }

  return { added, updated: 0, removed: 0, unchanged }
}

export const googleDriveAdapter: ContextAdapter = {
  id: 'google-drive',

  isAvailable(tenantId: string): boolean {
    const cfg = loadAdaptersYaml(tenantId)
    if (!cfg) return false
    // Check if Google Drive is configured
    return isGoogleDriveConfigured()
  },

  async sync(tenantId: string): Promise<SyncResult> {
    const cfg = loadAdaptersYaml(tenantId)
    if (!cfg) {
      return { added: 0, updated: 0, removed: 0, unchanged: 0 }
    }
    return syncOnce(tenantId, cfg)
  },

  async watch(_tenantId: string): Promise<UnsubscribeFn> {
    // Google Drive push notifications for future implementation
    return () => {}
  },
}
