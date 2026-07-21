/**
 * Data Extractors — Convert data from external sources into graph entities
 *
 * Each extractor:
 * 1. Connects to the data source (Notion, HubSpot, etc.)
 * 2. Retrieves raw data
 * 3. Extracts entities: companies, people, deals, objections, value props
 * 4. Returns structured nodes for graph ingestion
 */

import { Anthropic } from '@anthropic-ai/sdk'

export interface ExtractedNode {
  type: 'company' | 'person' | 'deal' | 'objection' | 'value_prop' | 'meeting' | 'note'
  name: string
  content: string
  metadata?: Record<string, unknown>
  relationships?: Array<{
    target: string
    type: string
  }>
}

// ─── NOTION EXTRACTOR ───────────────────────────────────────────────────────

export async function extractFromNotion(config: {
  apiKey: string
  databaseId: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    // TODO: Use Notion API to fetch database contents
    // For now, return placeholder
    console.log('Notion extraction would use:', config)

    // In real implementation:
    // 1. Query Notion database
    // 2. For each page/entry, extract:
    //    - Company name
    //    - Contact info
    //    - Deal stage
    //    - Notes (which may contain objections, value props)
    //    - Any other relevant metadata

    nodes.push({
      type: 'note',
      name: 'Notion extraction configured',
      content: `Connected to Notion database: ${config.databaseId}`,
      metadata: { source: 'notion' },
    })
  } catch (error) {
    console.error('Notion extraction failed:', error)
  }

  return nodes
}

// ─── HUBSPOT EXTRACTOR ──────────────────────────────────────────────────────

export async function extractFromHubSpot(config: {
  apiKey: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    // TODO: Use HubSpot API to fetch deals, contacts, companies
    // For now, return placeholder
    console.log('HubSpot extraction would use:', config)

    // In real implementation:
    // 1. Fetch all deals
    // 2. For each deal:
    //    - Extract company name, size, industry
    //    - Extract decision makers (contacts)
    //    - Extract deal value, stage, close date
    //    - Extract deal notes (objections, value props)
    // 3. Fetch contacts and enrich
    // 4. Create relationship graph

    nodes.push({
      type: 'note',
      name: 'HubSpot extraction configured',
      content: 'Connected to HubSpot CRM',
      metadata: { source: 'hubspot' },
    })
  } catch (error) {
    console.error('HubSpot extraction failed:', error)
  }

  return nodes
}

// ─── SALESFORCE EXTRACTOR ───────────────────────────────────────────────────

export async function extractFromSalesforce(config: {
  orgUrl: string
  clientId: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    // TODO: Use Salesforce API to fetch opportunities, accounts, contacts
    console.log('Salesforce extraction would use:', config)

    // In real implementation:
    // 1. OAuth flow to get access token
    // 2. Fetch all Opportunities
    // 3. For each opportunity:
    //    - Extract account (company)
    //    - Extract stage, amount, close date
    //    - Extract contacts involved
    //    - Extract opportunity notes (objections, value props)
    // 4. Extract account details (company info)
    // 5. Create relationship graph

    nodes.push({
      type: 'note',
      name: 'Salesforce extraction configured',
      content: `Connected to Salesforce: ${config.orgUrl}`,
      metadata: { source: 'salesforce' },
    })
  } catch (error) {
    console.error('Salesforce extraction failed:', error)
  }

  return nodes
}

// ─── FIREFLIES EXTRACTOR ────────────────────────────────────────────────────

export async function extractFromFireflies(config: {
  apiKey: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    // TODO: Use Fireflies API to fetch meeting transcripts
    // For now, return placeholder
    console.log('Fireflies extraction would use:', config)

    // In real implementation:
    // 1. Fetch all meetings
    // 2. For each meeting:
    //    - Get transcript
    //    - Use Claude to extract:
    //      - Companies mentioned
    //      - People on the call
    //      - Objections raised
    //      - Value props discussed
    //      - Buying signals
    //      - Next steps / timeline
    // 3. Create meeting node with relationships

    nodes.push({
      type: 'meeting',
      name: 'Fireflies integration ready',
      content: 'Connected to Fireflies meeting transcripts',
      metadata: { source: 'fireflies' },
    })
  } catch (error) {
    console.error('Fireflies extraction failed:', error)
  }

  return nodes
}

// ─── GOOGLE DRIVE EXTRACTOR ─────────────────────────────────────────────────

export async function extractFromGoogleDrive(): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    // TODO: Use Google Drive API to fetch documents
    // For now, return placeholder
    console.log('Google Drive extraction configured')

    // In real implementation:
    // 1. OAuth to get access
    // 2. List all files in shared folder
    // 3. For each document:
    //    - Download content
    //    - Use Claude to extract entities
    //    - Create nodes for companies, people, learnings

    nodes.push({
      type: 'note',
      name: 'Google Drive extraction configured',
      content: 'Connected to Google Drive',
      metadata: { source: 'google-drive' },
    })
  } catch (error) {
    console.error('Google Drive extraction failed:', error)
  }

  return nodes
}

// ─── WEBSITE EXTRACTOR ──────────────────────────────────────────────────────

/** Max pages to crawl per site — bounds Firecrawl credit usage and runtime. */
const MAX_WEBSITE_PAGES = 10

/** Splits markdown into { headingText, body } for every heading found, no cap. */
function extractSections(markdown: string): { headingText: string; body: string }[] {
  const headingRegex = /^#{1,3}\s+.+$/gm
  const headings: { text: string; start: number; end: number }[] = []
  let headingMatch: RegExpExecArray | null
  while ((headingMatch = headingRegex.exec(markdown)) !== null) {
    headings.push({
      text: headingMatch[0],
      start: headingMatch.index,
      end: headingMatch.index + headingMatch[0].length,
    })
  }

  return headings
    .map((heading, i) => {
      const headingText = heading.text.replace(/^#+\s+/, '').trim()
      const sectionEnd = headings[i + 1] ? headings[i + 1].start : markdown.length
      const body = markdown
        .slice(heading.end, sectionEnd)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip markdown links, keep label text
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 300)
      return { headingText, body }
    })
    .filter((s) => s.headingText)
}

export async function extractFromWebsite(config: {
  url: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    if (!config.url) {
      throw new Error('Website URL is required')
    }

    // Normalize URL
    let url = config.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)
    const domain = urlObj.hostname
    const siteTitle = domain.replace('www.', '').split('.')[0].toUpperCase()

    const { firecrawlService } = await import('../services/firecrawl.js')

    if (!firecrawlService.isAvailable()) {
      throw new Error('Firecrawl API key not configured. Set FIRECRAWL_API_KEY env var.')
    }

    // Root node represents the whole site; every page and section hangs off it.
    nodes.push({
      type: 'note',
      name: siteTitle,
      content: `Website: ${domain}`,
      metadata: { source: 'website', domain, url },
    })

    // Breadth-first crawl discovered from in-page links found in each
    // scraped page's markdown. Firecrawl's `map` endpoint only reads
    // sitemap.xml, which most small sites (like this one) don't have — so
    // it can't find pages linked only via on-page navigation. Following
    // links in the already-fetched markdown works regardless.
    const seenPaths = new Set<string>([urlObj.pathname])
    const queue = [url]
    let pagesScraped = 0

    while (queue.length > 0 && pagesScraped < MAX_WEBSITE_PAGES) {
      const pageUrl = queue.shift()!
      let markdown: string
      try {
        markdown = await firecrawlService.scrape(pageUrl)
      } catch (scrapeError) {
        console.error(`[Website] Failed to scrape ${pageUrl}:`, scrapeError)
        continue
      }
      if (!markdown) continue
      pagesScraped++

      const isHomepage = pageUrl === url
      const pagePath = new URL(pageUrl).pathname
      const pageName = isHomepage
        ? siteTitle
        : pagePath.replace(/^\/|\/$/g, '').replace(/[-_/]/g, ' ') || siteTitle

      if (!isHomepage) {
        nodes.push({
          type: 'note',
          name: pageName,
          content: markdown.replace(/\s+/g, ' ').trim().substring(0, 300),
          metadata: { source: 'website', domain, url: pageUrl, type: 'page' },
          relationships: [{ target: siteTitle, type: 'page_of' }],
        })
      }

      extractSections(markdown).forEach(({ headingText, body }) => {
        nodes.push({
          type: 'note',
          name: headingText,
          content: body || `Section from ${domain}`,
          metadata: { source: 'website', domain, url: pageUrl, type: 'section' },
          relationships: [{ target: pageName, type: 'section_of' }],
        })
      })

      // Queue newly discovered same-domain links for the next iterations.
      const linkRegex = /\]\((https?:\/\/[^)\s]+)\)/g
      let linkMatch: RegExpExecArray | null
      while ((linkMatch = linkRegex.exec(markdown)) !== null) {
        let linkUrl: URL
        try {
          linkUrl = new URL(linkMatch[1])
        } catch {
          continue
        }
        if (linkUrl.hostname !== domain) continue
        if (seenPaths.has(linkUrl.pathname)) continue
        seenPaths.add(linkUrl.pathname)
        queue.push(`${linkUrl.origin}${linkUrl.pathname}`)
      }
    }

    console.log(`[Website] Created ${nodes.length} node(s) from ${domain} across ${pagesScraped} page(s)`)
  } catch (error) {
    console.error('[Website] Extraction failed:', error)
    throw error
  }

  return nodes
}

// ─── OBSIDIAN VAULT EXTRACTOR ───────────────────────────────────────────────

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

interface ObsidianNote {
  path: string
  name: string
  frontmatter?: Record<string, unknown>
  content: string
  wikiLinks: string[]
}

function parseMarkdownFile(filePath: string): ObsidianNote {
  const content = readFileSync(filePath, 'utf-8')
  const name = filePath.split('/').pop()?.replace('.md', '') || 'Untitled'

  // Extract YAML frontmatter
  let frontmatter: Record<string, unknown> = {}
  let markdownContent = content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (frontmatterMatch) {
    const yamlContent = frontmatterMatch[1]
    // Simple YAML parser for common fields
    const lines = yamlContent.split('\n')
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '')
        frontmatter[key.trim()] = value
      }
    }
    markdownContent = content.replace(frontmatterMatch[0], '')
  }

  // Extract wiki-links: [[Note Name]] or [[path/Note Name|Display Name]]
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const wikiLinks: string[] = []
  let match
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    wikiLinks.push(match[1].trim())
  }

  return {
    path: filePath,
    name,
    frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
    content: markdownContent,
    wikiLinks,
  }
}

function walkVault(vaultPath: string, excludeDirs = ['.obsidian', '.git', 'node_modules']): string[] {
  const mdFiles: string[] = []

  function walk(dir: string) {
    try {
      const entries = readdirSync(dir)
      for (const entry of entries) {
        if (excludeDirs.includes(entry)) continue

        const fullPath = join(dir, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          walk(fullPath)
        } else if (entry.endsWith('.md')) {
          mdFiles.push(fullPath)
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error)
    }
  }

  walk(vaultPath)
  return mdFiles
}

export async function extractFromObsidian(config: {
  vaultPath?: string
}): Promise<ExtractedNode[]> {
  const nodes: ExtractedNode[] = []

  try {
    if (!config.vaultPath) {
      throw new Error('Vault path is required')
    }

    // Expand home directory
    const vaultPath = config.vaultPath.startsWith('~')
      ? config.vaultPath.replace('~', process.env.HOME || '/root')
      : config.vaultPath

    // Verify vault exists
    try {
      statSync(vaultPath)
    } catch {
      throw new Error(`Vault path not found: ${vaultPath}`)
    }

    // Find all markdown files
    const mdFiles = walkVault(vaultPath)

    if (mdFiles.length === 0) {
      throw new Error('No markdown files found in vault')
    }

    // Parse each file and create nodes
    const notesMap = new Map<string, ObsidianNote>()
    const relationships: Array<{ from: string; to: string; type: string }> = []

    for (const filePath of mdFiles) {
      const note = parseMarkdownFile(filePath)
      notesMap.set(note.name, note)

      // Create node for this note
      const nodeContent = note.frontmatter
        ? `${note.content.substring(0, 200)}...\n\nMetadata: ${JSON.stringify(note.frontmatter)}`
        : note.content.substring(0, 200)

      nodes.push({
        type: 'note',
        name: note.name,
        content: nodeContent,
        metadata: {
          source: 'obsidian',
          path: note.path,
          ...note.frontmatter,
        },
        relationships: note.wikiLinks.map((link) => ({
          target: link,
          type: 'links_to',
        })),
      })

      // Track wiki-links for relationships
      for (const link of note.wikiLinks) {
        relationships.push({
          from: note.name,
          to: link,
          type: 'links_to',
        })
      }
    }

    // Create nodes for linked notes that don't have files (backlinks)
    for (const [name, note] of notesMap.entries()) {
      for (const link of note.wikiLinks) {
        if (!notesMap.has(link)) {
          // Referenced note doesn't exist in vault - create a placeholder
          nodes.push({
            type: 'note',
            name: link,
            content: `Referenced from: ${name}`,
            metadata: {
              source: 'obsidian',
              isReference: true,
            },
          })
        }
      }
    }

    console.log(`Obsidian extraction: found ${mdFiles.length} notes with ${relationships.length} links`)
  } catch (error) {
    console.error('Obsidian extraction failed:', error)
    throw error
  }

  return nodes
}

// ─── CLAUDE EXTRACTION ───────────────────────────────────────────────────────
// Use Claude to extract entities from unstructured text (transcripts, notes, etc.)

export async function extractEntitiesFromText(text: string, context?: string): Promise<ExtractedNode[]> {
  const client = new Anthropic()

  const prompt = `Extract structured information from this text. Identify and extract:

1. COMPANIES mentioned (name, industry if stated)
2. PEOPLE mentioned (name, role if stated)
3. DEALS or OPPORTUNITIES (description, value, stage)
4. OBJECTIONS raised (what the prospect said they're concerned about)
5. VALUE PROPOSITIONS mentioned (what we/they benefit from)
6. BUYING SIGNALS (positive indicators: budget approved, timeline set, etc.)
7. MEETING NOTES (key discussions, next steps, outcomes)

${context ? `Context: ${context}\n` : ''}

Text to extract from:
${text}

Format your response as JSON with this structure:
{
  "companies": [{"name": "...", "industry": "..."}],
  "people": [{"name": "...", "role": "...", "company": "..."}],
  "deals": [{"description": "...", "value": "...", "stage": "...", "company": "..."}],
  "objections": [{"objection": "...", "context": "..."}],
  "value_props": [{"value_prop": "...", "for_whom": "..."}],
  "buying_signals": [{"signal": "...", "strength": "high|medium|low"}],
  "notes": [{"note": "...", "topic": "..."}]
}

Only include fields that have values. Be specific and avoid generic statements.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const extracted = JSON.parse(jsonMatch[0])
    const nodes: ExtractedNode[] = []

    // Convert extracted data to nodes
    if (extracted.companies) {
      extracted.companies.forEach((company: { name: string; industry?: string }) => {
        nodes.push({
          type: 'company',
          name: company.name,
          content: company.industry ? `Industry: ${company.industry}` : 'Company',
          metadata: { source: 'text-extraction' },
        })
      })
    }

    if (extracted.people) {
      extracted.people.forEach((person: { name: string; role?: string; company?: string }) => {
        nodes.push({
          type: 'person',
          name: person.name,
          content: [person.role, person.company].filter(Boolean).join(' at '),
          metadata: { source: 'text-extraction' },
        })
      })
    }

    if (extracted.objections) {
      extracted.objections.forEach((obj: { objection: string; context?: string }) => {
        nodes.push({
          type: 'objection',
          name: obj.objection,
          content: obj.context || obj.objection,
          metadata: { source: 'text-extraction' },
        })
      })
    }

    if (extracted.value_props) {
      extracted.value_props.forEach((vp: { value_prop: string; for_whom?: string }) => {
        nodes.push({
          type: 'value_prop',
          name: vp.value_prop,
          content: vp.for_whom ? `For: ${vp.for_whom}` : vp.value_prop,
          metadata: { source: 'text-extraction' },
        })
      })
    }

    if (extracted.deals) {
      extracted.deals.forEach((deal: { description: string; value?: string; stage?: string; company?: string }) => {
        nodes.push({
          type: 'deal',
          name: deal.description,
          content: [deal.value, deal.stage, deal.company].filter(Boolean).join(' | '),
          metadata: { source: 'text-extraction' },
        })
      })
    }

    if (extracted.notes) {
      extracted.notes.forEach((note: { note: string; topic?: string }) => {
        nodes.push({
          type: 'note',
          name: note.topic || 'Note',
          content: note.note,
          metadata: { source: 'text-extraction' },
        })
      })
    }

    return nodes
  } catch (error) {
    console.error('Entity extraction failed:', error)
    return []
  }
}
