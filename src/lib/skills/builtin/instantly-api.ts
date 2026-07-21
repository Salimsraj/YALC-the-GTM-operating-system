import type { Skill, SkillEvent, SkillContext } from '../types'

interface InstantlyLead {
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  title?: string
}

interface SequenceStep {
  subject?: string
  body: string
  delay_days?: number
}

interface InstantlyApiInput {
  operation: 'create_campaign' | 'list_campaigns' | 'add_leads' | 'get_analytics'
  campaignName?: string
  campaignId?: string
  leads?: InstantlyLead[]
  sequences?: SequenceStep[]
  accountIds?: string[]
  dryRun?: boolean
}

export const instantlyApiSkill: Skill = {
  id: 'instantly-api',
  name: 'Instantly API',
  version: '1.0.0',
  description:
    'Cold email campaign management via Instantly.ai API. Create campaigns, add leads, list campaigns, and track analytics.',
  category: 'outreach',

  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['create_campaign', 'list_campaigns', 'add_leads', 'get_analytics'],
        description: 'Operation: create_campaign (with sequences), list_campaigns (all), add_leads (to existing campaign), get_analytics (campaign stats)',
      },
      campaignName: {
        type: 'string',
        description: 'Campaign name (required for create_campaign)',
      },
      campaignId: {
        type: 'string',
        description: 'Campaign ID (required for add_leads and get_analytics)',
      },
      leads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            company_name: { type: 'string' },
            title: { type: 'string' },
          },
          required: ['email'],
        },
        description: 'Leads array with email, first_name, last_name, company_name, title. Required for add_leads.',
      },
      sequences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string', description: 'Email subject (optional for follow-ups)' },
            body: { type: 'string', description: 'Email body (required)' },
            delay_days: { type: 'number', description: 'Days to wait before sending (default 0)' },
          },
          required: ['body'],
        },
        description: 'Email sequence steps with subject, body, delay_days. Required for create_campaign.',
      },
      accountIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Instantly email account IDs to use (optional)',
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview without creating/modifying campaign (default false)',
      },
    },
    required: ['operation'],
  },

  outputSchema: {
    type: 'object',
    properties: {
      campaignId: { type: 'string' },
      campaignName: { type: 'string' },
      status: { type: 'string' },
      leadCount: { type: 'number' },
      sequenceSteps: { type: 'number' },
    },
  },

  requiredCapabilities: ['email_send'],

  async *execute(input: unknown, context: SkillContext): AsyncIterable<SkillEvent> {
    const { operation, campaignName, campaignId, leads, sequences, accountIds, dryRun } = input as InstantlyApiInput

    // Validate operation
    if (!operation) {
      yield { type: 'error', message: 'operation is required (create_campaign, list_campaigns, add_leads, or get_analytics)' }
      return
    }

    yield { type: 'progress', message: `Resolving Instantly provider for ${operation}...`, percent: 5 }

    // Resolve provider
    let provider
    try {
      provider = context.providers.resolve({ stepType: 'email_send', provider: 'instantly' })
    } catch (err) {
      yield { type: 'error', message: `Instantly provider not available: ${err instanceof Error ? err.message : String(err)}` }
      return
    }

    yield { type: 'progress', message: `Using provider: ${provider.name}`, percent: 10 }

    // Validate operation-specific inputs
    if (operation === 'create_campaign') {
      if (!campaignName) {
        yield { type: 'error', message: 'campaignName is required for create_campaign' }
        return
      }
      if (!sequences || sequences.length === 0) {
        yield { type: 'error', message: 'sequences array is required and must not be empty for create_campaign' }
        return
      }
    }

    if (operation === 'add_leads') {
      if (!campaignId) {
        yield { type: 'error', message: 'campaignId is required for add_leads' }
        return
      }
      if (!leads || leads.length === 0) {
        yield { type: 'error', message: 'leads array is required and must not be empty for add_leads' }
        return
      }
    }

    if (operation === 'get_analytics') {
      if (!campaignId) {
        yield { type: 'error', message: 'campaignId is required for get_analytics' }
        return
      }
    }

    // Handle dry-run
    if (dryRun) {
      yield {
        type: 'progress',
        message: `[dry-run] Would execute ${operation}. ${leads ? `${leads.length} leads. ` : ''}${sequences ? `${sequences.length} sequence steps. ` : ''}No campaigns created/modified.`,
        percent: 100,
      }

      let result: Record<string, unknown> = {
        status: 'dry_run',
      }

      if (operation === 'create_campaign') {
        result = {
          campaignId: 'dry-run-id',
          campaignName: campaignName ?? 'Dry Run Campaign',
          status: 'dry_run',
          sequenceSteps: sequences?.length ?? 0,
          leadCount: leads?.length ?? 0,
        }
      } else if (operation === 'list_campaigns') {
        result = {
          status: 'dry_run',
          campaignCount: 0,
        }
      } else if (operation === 'add_leads') {
        result = {
          campaignId,
          status: 'dry_run',
          leadCount: leads?.length ?? 0,
        }
      }

      yield { type: 'result', data: result }
      return
    }

    // Build step configuration based on operation
    let description = ''
    let stepType = 'email_send'
    let config: Record<string, unknown> = {}

    if (operation === 'create_campaign') {
      description = `Create Instantly campaign: ${campaignName} (${sequences!.length} steps)`
      config = {
        campaignName,
        sequences,
        account_ids: accountIds,
      }
    } else if (operation === 'add_leads') {
      description = `Add ${leads!.length} leads to campaign ${campaignId}`
      stepType = 'export'
      config = {
        campaignId,
      }
    } else if (operation === 'list_campaigns') {
      description = 'List all Instantly campaigns'
      stepType = 'search'
      config = {}
    } else if (operation === 'get_analytics') {
      description = `Get analytics for campaign ${campaignId}`
      stepType = 'search'
      config = {
        campaignId,
      }
    }

    const step = {
      stepIndex: 0,
      title: `Instantly: ${operation}`,
      stepType,
      provider: provider.id,
      description,
      config,
    }

    const executionContext = {
      frameworkContext: '',
      batchSize: Math.min(leads?.length ?? 100, 100),
      totalRequested: leads?.length ?? 100,
      previousStepRows: operation === 'add_leads' ? (leads as unknown as Record<string, unknown>[]) : [],
    }

    yield { type: 'progress', message: `Executing ${operation}...`, percent: 20 }

    let totalRows = 0
    try {
      for await (const batch of provider.execute(step, executionContext)) {
        totalRows += batch.rows.length
        const percent = Math.min(20 + (totalRows / Math.max(leads?.length ?? 1, 1)) * 70, 90)
        yield { type: 'progress', message: `${operation} progress: ${totalRows} items...`, percent }
        yield {
          type: 'result',
          data: {
            rows: batch.rows,
            batchIndex: batch.batchIndex,
            totalSoFar: batch.totalSoFar,
          },
        }
      }
    } catch (err) {
      yield {
        type: 'error',
        message: `Instantly ${operation} failed: ${err instanceof Error ? err.message : String(err)}`,
      }
      return
    }

    yield {
      type: 'progress',
      message: `${operation} complete. Processed ${totalRows} items.`,
      percent: 100,
    }
  },
}
