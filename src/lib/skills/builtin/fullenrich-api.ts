import type { Skill, SkillEvent, SkillContext } from '../types'

interface FullEnrichContact {
  firstname: string
  lastname: string
  domain?: string
  company_name?: string
  linkedin_url?: string
}

interface FullEnrichApiInput {
  contacts: FullEnrichContact[]
  dryRun?: boolean
}

export const fullenrichApiSkill: Skill = {
  id: 'fullenrich-api',
  name: 'FullEnrich API',
  version: '1.0.0',
  description:
    'Bulk enrich contact email and phone numbers via FullEnrich API. Accepts list of contacts with name/domain/company, returns verified email and phone.',
  category: 'data',

  inputSchema: {
    type: 'object',
    properties: {
      contacts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            firstname: { type: 'string', description: 'First name of contact' },
            lastname: { type: 'string', description: 'Last name of contact' },
            domain: { type: 'string', description: 'Company website domain (optional)' },
            company_name: { type: 'string', description: 'Company name (optional)' },
            linkedin_url: { type: 'string', description: 'LinkedIn profile URL (optional)' },
          },
          required: ['firstname', 'lastname'],
        },
        description: 'Array of contacts to enrich. At minimum, provide firstname and lastname.',
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview enrichment without using credits (default false)',
      },
    },
    required: ['contacts'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      enrichedRows: {
        type: 'array',
        items: { type: 'object' },
        description: 'Enriched contacts with email, phone, and status',
      },
      enrichedCount: { type: 'number' },
      totalCount: { type: 'number' },
    },
  },

  requiredCapabilities: ['enrich'],

  async *execute(input: unknown, context: SkillContext): AsyncIterable<SkillEvent> {
    const { contacts, dryRun } = input as FullEnrichApiInput

    // Validate input
    if (!Array.isArray(contacts) || contacts.length === 0) {
      yield { type: 'error', message: 'contacts array is required and must not be empty' }
      return
    }

    if (dryRun) {
      yield {
        type: 'progress',
        message: `[dry-run] Would enrich ${contacts.length} contacts via FullEnrich API. No credits used.`,
        percent: 100,
      }
      yield {
        type: 'result',
        data: {
          enrichedRows: contacts.map(c => ({
            ...c,
            email: '(enriched)',
            phone: '(enriched)',
            email_status: 'dry_run',
          })),
          enrichedCount: contacts.length,
          totalCount: contacts.length,
        },
      }
      return
    }

    yield { type: 'progress', message: 'Resolving FullEnrich provider...', percent: 5 }

    // Resolve provider
    let provider
    try {
      provider = context.providers.resolve({ stepType: 'enrich', provider: 'fullenrich' })
    } catch (err) {
      yield { type: 'error', message: `FullEnrich provider not available: ${err instanceof Error ? err.message : String(err)}` }
      return
    }

    yield { type: 'progress', message: `Using provider: ${provider.name}`, percent: 10 }

    const step = {
      stepIndex: 0,
      title: 'Bulk Enrich Contacts',
      stepType: 'enrich',
      provider: provider.id,
      description: `Enrich ${contacts.length} contacts with email and phone via FullEnrich`,
      config: {
        operation: 'bulk_enrich',
      },
    }

    const executionContext = {
      frameworkContext: '',
      batchSize: contacts.length,
      totalRequested: contacts.length,
      previousStepRows: (contacts as unknown as Record<string, unknown>[]),
    }

    yield { type: 'progress', message: `Submitting ${contacts.length} contacts to FullEnrich...`, percent: 20 }

    let enrichedCount = 0
    try {
      for await (const batch of provider.execute(step, executionContext)) {
        enrichedCount += batch.rows.length
        const percent = Math.min(20 + (enrichedCount / contacts.length) * 70, 90)
        yield { type: 'progress', message: `Enriched ${enrichedCount}/${contacts.length} contacts...`, percent }
        yield {
          type: 'result',
          data: {
            enrichedRows: batch.rows,
            batchIndex: batch.batchIndex,
            totalSoFar: batch.totalSoFar,
          },
        }
      }
    } catch (err) {
      yield {
        type: 'error',
        message: `FullEnrich enrichment failed: ${err instanceof Error ? err.message : String(err)}`,
      }
      return
    }

    yield {
      type: 'progress',
      message: `Enrichment complete. ${enrichedCount}/${contacts.length} contacts enriched.`,
      percent: 100,
    }
  },
}
