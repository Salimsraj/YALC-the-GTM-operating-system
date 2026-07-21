import type { Skill, SkillEvent, SkillContext } from '../types'

interface FirecrawlApiInput {
  operation: 'scrape' | 'search' | 'map' | 'extract'
  url?: string
  urls?: string[]
  query?: string
  limit?: number
  schema?: Record<string, unknown>
}

export const firecrawlApiSkill: Skill = {
  id: 'firecrawl-api',
  name: 'Firecrawl API',
  version: '1.0.0',
  description:
    'Web scraping and extraction via Firecrawl. Supports scrape URL to markdown, web search, site mapping, and structured data extraction with custom schemas.',
  category: 'research',

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['scrape', 'search', 'map', 'extract'],
        description: 'Operation: scrape (URL to markdown), search (web search), map (site links), extract (structured data from URL)',
      },
      url: {
        type: 'string',
        description: 'Single URL to scrape or map (required for scrape/map operations)',
      },
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of URLs for extract operation',
      },
      query: {
        type: 'string',
        description: 'Search query (required for search operation)',
      },
      limit: {
        type: 'number',
        description: 'Max results: search results or site map links (default 10 for search, 100 for map)',
      },
      schema: {
        type: 'object',
        description: 'JSON schema for structured extraction (used by extract operation). Define fields and types to extract from URLs.',
      },
    },
    required: ['operation'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      rows: {
        type: 'array',
        items: { type: 'object' },
        description: 'Extracted data formatted as rows',
      },
      totalSoFar: { type: 'number' },
      batchIndex: { type: 'number' },
    },
  },

  requiredCapabilities: ['search'],

  async *execute(input: unknown, context: SkillContext): AsyncIterable<SkillEvent> {
    const { operation, url, urls, query, limit, schema } = input as FirecrawlApiInput

    // Validate operation
    if (!operation) {
      yield { type: 'error', message: 'operation is required (scrape, search, map, or extract)' }
      return
    }

    yield { type: 'progress', message: `Resolving Firecrawl provider for ${operation}...`, percent: 5 }

    // Resolve provider
    let provider
    try {
      provider = context.providers.resolve({ stepType: 'search', provider: 'firecrawl' })
    } catch (err) {
      yield { type: 'error', message: `Firecrawl provider not available: ${err instanceof Error ? err.message : String(err)}` }
      return
    }

    yield { type: 'progress', message: `Using provider: ${provider.name}`, percent: 10 }

    // Validate operation-specific inputs
    if (operation === 'scrape' && !url) {
      yield { type: 'error', message: 'url is required for scrape operation' }
      return
    }

    if (operation === 'map' && !url) {
      yield { type: 'error', message: 'url is required for map operation' }
      return
    }

    if (operation === 'search' && !query) {
      yield { type: 'error', message: 'query is required for search operation' }
      return
    }

    if (operation === 'extract' && (!urls || urls.length === 0)) {
      yield { type: 'error', message: 'urls array is required and must not be empty for extract operation' }
      return
    }

    // Build step configuration
    let description = ''
    let config: Record<string, unknown> = {}

    if (operation === 'scrape') {
      description = `Scrape ${url} to markdown`
      config = { url }
    } else if (operation === 'search') {
      description = `Search web for: ${query}`
      config = { query, limit: limit ?? 10 }
    } else if (operation === 'map') {
      description = `Map site structure: ${url}`
      config = { url, limit: limit ?? 100 }
    } else if (operation === 'extract') {
      description = `Extract structured data from ${urls!.length} URLs`
      config = { urls, schema, limit }
    }

    const step = {
      stepIndex: 0,
      title: `Firecrawl: ${operation}`,
      stepType: 'search',
      provider: provider.id,
      description,
      config,
    }

    const executionContext = {
      frameworkContext: '',
      batchSize: limit ?? 10,
      totalRequested: limit ?? 10,
    }

    yield { type: 'progress', message: `Executing ${operation}...`, percent: 20 }

    let totalRows = 0
    try {
      for await (const batch of provider.execute(step, executionContext)) {
        totalRows += batch.rows.length
        const percent = Math.min(20 + (totalRows / (limit ?? 10)) * 70, 90)

        let progressMsg = `Retrieved ${totalRows} results...`
        if (operation === 'scrape' && totalRows > 0) {
          progressMsg = `Scraped ${totalRows} page(s) to markdown...`
        } else if (operation === 'search' && totalRows > 0) {
          progressMsg = `Found ${totalRows} search results...`
        } else if (operation === 'map' && totalRows > 0) {
          progressMsg = `Found ${totalRows} links...`
        } else if (operation === 'extract' && totalRows > 0) {
          progressMsg = `Extracted data from ${totalRows} URL(s)...`
        }

        yield { type: 'progress', message: progressMsg, percent }
        yield { type: 'result', data: { rows: batch.rows, batchIndex: batch.batchIndex, totalSoFar: batch.totalSoFar } }
      }
    } catch (err) {
      yield {
        type: 'error',
        message: `Firecrawl ${operation} failed: ${err instanceof Error ? err.message : String(err)}`,
      }
      return
    }

    const operationName = operation.charAt(0).toUpperCase() + operation.slice(1)
    yield {
      type: 'progress',
      message: `${operationName} complete. ${totalRows} results retrieved.`,
      percent: 100,
    }
  },
}
