import type { StepExecutor, RowBatch, ExecutionContext, WorkflowStepInput, ProviderCapability, ProviderHealthStatus } from '../types'
import type { ColumnDef } from '../../ai/types'
import { prospeoService } from '../../services/prospeo'

const PEOPLE_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'linkedin_url', label: 'LinkedIn', type: 'url' },
  { key: 'confidence', label: 'Confidence', type: 'score' },
]

export class ProspeoProvider implements StepExecutor {
  id = 'prospeo'
  name = 'Prospeo'
  description = 'Find people, enrich emails and phone numbers for B2B outreach'
  type = 'builtin' as const
  capabilities: ProviderCapability[] = ['search', 'enrich', 'custom']

  isAvailable(): boolean {
    return prospeoService.isAvailable()
  }

  canExecute(step: WorkflowStepInput): boolean {
    if (step.provider === 'prospeo') return true
    const desc = (step.description ?? '').toLowerCase()
    return (desc.includes('find people') || desc.includes('enrich') || desc.includes('email'))
  }

  async *execute(step: WorkflowStepInput, context: ExecutionContext): AsyncIterable<RowBatch> {
    try {
      const config = (step.config as any) || {}
      const searchQuery = config.query || step.description || ''

      if (!searchQuery.trim()) {
        yield {
          rows: [],
          batchIndex: 0,
          totalSoFar: 0,
        }
        return
      }

      // Parse search parameters
      const params: any = {
        limit: config.limit || 50,
      }

      // Extract parameters from query or config
      if (config.company) params.company = config.company
      if (config.domain) params.domain = config.domain
      if (config.title) params.title = config.title
      if (config.first_name) params.first_name = config.first_name
      if (config.last_name) params.last_name = config.last_name

      // Execute search
      const results = await prospeoService.findPeople(params)

      // Convert results to rows
      const rows = results.map(r => ({
        name: `${r.name || ''}`.trim(),
        title: r.title || '',
        company: r.company || '',
        email: r.email || '',
        phone: r.phone || '',
        linkedin_url: r.linkedin_url || '',
        confidence: r.confidence || 0,
      }))

      // Batch the results
      const batchSize = context.batchSize || 25
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize)
        yield {
          rows: batch,
          batchIndex: Math.floor(i / batchSize),
          totalSoFar: Math.min(i + batchSize, rows.length),
        }
      }
    } catch (err) {
      console.error(`Prospeo execution error: ${err instanceof Error ? err.message : String(err)}`)
      yield {
        rows: [],
        batchIndex: 0,
        totalSoFar: 0,
      }
    }
  }

  getColumnDefinitions(_step: WorkflowStepInput): ColumnDef[] {
    return PEOPLE_COLUMNS
  }

  async selfHealthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isAvailable()) {
      return {
        status: 'warn',
        detail: 'PROSPEO_API_KEY not set',
      }
    }

    const check = await prospeoService.healthCheck()
    if (check.ok) {
      return {
        status: 'ok',
        detail: check.message,
      }
    }
    return {
      status: 'fail',
      detail: check.message,
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    return prospeoService.healthCheck()
  }
}
