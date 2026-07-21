import type { Skill, SkillEvent, SkillContext } from '../types'

interface CrustdataApiInput {
  operation: 'search_companies' | 'search_people' | 'enrich_company'
  filters?: Record<string, unknown>
  domain?: string
  limit?: number
}

export const crustdataApiSkill: Skill = {
  id: 'crustdata-api',
  name: 'Crustdata API',
  version: '1.0.0',
  description:
    'Direct access to Crustdata API for company search, people search, and company enrichment. Returns structured data via RowBatch format.',
  category: 'research',

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['search_companies', 'search_people', 'enrich_company'],
        description: 'Operation to perform: search_companies (DB search with filters), search_people (by company/title/seniority), or enrich_company (by domain)',
      },
      filters: {
        type: 'object',
        description: 'Search filters object. For search_companies: industry, employeeRange, location, keywords, limit. For search_people: companyNames, companyDomains, titles, seniorityLevels, location, limit.',
      },
      domain: {
        type: 'string',
        description: 'Company domain (required for enrich_company operation)',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default 50, max 1000 for company search)',
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
        description: 'Returned data rows from Crustdata',
      },
      totalSoFar: { type: 'number' },
      batchIndex: { type: 'number' },
    },
  },

  requiredCapabilities: ['search', 'enrich'],

  async *execute(input: unknown, context: SkillContext): AsyncIterable<SkillEvent> {
    const { operation, filters = {}, domain, limit } = input as CrustdataApiInput

    // Validate input
    if (!operation) {
      yield { type: 'error', message: 'operation is required (search_companies, search_people, or enrich_company)' }
      return
    }

    yield { type: 'progress', message: `Resolving Crustdata provider for ${operation}...`, percent: 5 }

    // Resolve provider based on operation type
    let provider
    try {
      if (operation === 'search_people') {
        provider = context.providers.resolve({ stepType: 'search', provider: 'crustdata' })
      } else if (operation === 'enrich_company') {
        provider = context.providers.resolve({ stepType: 'enrich', provider: 'crustdata' })
      } else {
        provider = context.providers.resolve({ stepType: 'search', provider: 'crustdata' })
      }
    } catch (err) {
      yield { type: 'error', message: `Crustdata provider not available: ${err instanceof Error ? err.message : String(err)}` }
      return
    }

    yield { type: 'progress', message: `Using provider: ${provider.name}`, percent: 10 }

    // Build step configuration based on operation
    let stepType = 'search'
    let description = ''
    let config: Record<string, unknown> = {}

    if (operation === 'search_companies') {
      stepType = 'search'
      description = 'Search companies in Crustdata database with filters'
      config = {
        ...filters,
        limit: limit ?? 50,
      }
    } else if (operation === 'search_people') {
      stepType = 'search'
      description = 'Search people by company, title, or seniority level'
      config = {
        ...filters,
        limit: limit ?? 50,
      }
    } else if (operation === 'enrich_company') {
      if (!domain) {
        yield { type: 'error', message: 'domain is required for enrich_company operation' }
        return
      }
      stepType = 'enrich'
      description = `Enrich company data for domain: ${domain}`
      config = { domain }
    }

    const step = {
      stepIndex: 0,
      title: `Crustdata: ${operation}`,
      stepType,
      provider: provider.id,
      description,
      config,
    }

    const executionContext = {
      frameworkContext: '',
      batchSize: limit ?? 50,
      totalRequested: limit ?? 50,
    }

    yield { type: 'progress', message: `Executing ${operation}...`, percent: 20 }

    let totalRows = 0
    try {
      for await (const batch of provider.execute(step, executionContext)) {
        totalRows += batch.rows.length
        const percent = Math.min(20 + (totalRows / (limit ?? 50)) * 70, 90)
        yield { type: 'progress', message: `Retrieved ${totalRows} rows...`, percent }
        yield { type: 'result', data: { rows: batch.rows, batchIndex: batch.batchIndex, totalSoFar: batch.totalSoFar } }
      }
    } catch (err) {
      yield {
        type: 'error',
        message: `Crustdata ${operation} failed: ${err instanceof Error ? err.message : String(err)}`,
      }
      return
    }

    yield { type: 'progress', message: `${operation} complete. ${totalRows} rows retrieved.`, percent: 100 }
  },
}
