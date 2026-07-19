import type { StepExecutor, RowBatch, ExecutionContext, WorkflowStepInput, ProviderCapability, ProviderHealthStatus } from '../types'
import type { ColumnDef } from '../../ai/types'
import { coldiqService } from '../../services/coldiq'

const SEARCH_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'linkedin', label: 'LinkedIn', type: 'url' },
]

const ENRICH_COLUMNS: ColumnDef[] = [
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'company_info', label: 'Company Info', type: 'text' },
  { key: 'technographics', label: 'Tech Stack', type: 'text' },
  { key: 'funding_info', label: 'Funding', type: 'text' },
]

export class ColdIQProvider implements StepExecutor {
  id = 'coldiq'
  name = 'ColdIQ'
  description = 'Unified B2B data API with 39 integrated providers (Apollo, PDL, FullEnrich, etc.)'
  type = 'builtin' as const
  capabilities: ProviderCapability[] = ['search', 'enrich', 'custom']

  isAvailable(): boolean {
    return coldiqService.isAvailable()
  }

  canExecute(step: WorkflowStepInput): boolean {
    if (step.provider === 'coldiq') return true
    // Can handle search/enrich steps if explicitly requested
    return step.stepType === 'search' || step.stepType === 'enrich'
  }

  async *execute(step: WorkflowStepInput, context: ExecutionContext): AsyncIterable<RowBatch> {
    // Get query from step config or description
    const query = (step.config?.query as string) || step.description || ''

    if (!query) {
      yield {
        rows: [],
        batchIndex: 0,
        totalSoFar: 0,
      }
      return
    }

    try {
      const result = await coldiqService.query(query)

      if (!result.success) {
        console.error(`ColdIQ query failed: ${result.error}`)
        yield {
          rows: [],
          batchIndex: 0,
          totalSoFar: 0,
        }
        return
      }

      // ColdIQ returns structured data; batch it
      const batchSize = context.batchSize || 25
      const totalRows = result.data.length

      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = result.data.slice(i, i + batchSize)
        yield {
          rows: batch,
          batchIndex: Math.floor(i / batchSize),
          totalSoFar: Math.min(i + batchSize, totalRows),
        }
      }
    } catch (err) {
      console.error(`ColdIQ execution error: ${err instanceof Error ? err.message : String(err)}`)
      yield {
        rows: [],
        batchIndex: 0,
        totalSoFar: 0,
      }
    }
  }

  getColumnDefinitions(step: WorkflowStepInput): ColumnDef[] {
    switch (step.stepType) {
      case 'search':
        return SEARCH_COLUMNS
      case 'enrich':
        return ENRICH_COLUMNS
      default:
        return SEARCH_COLUMNS
    }
  }

  async selfHealthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isAvailable()) {
      return {
        status: 'warn',
        detail: 'COLDIQ_API_KEY not set',
      }
    }

    const check = await coldiqService.healthCheck()
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
    return coldiqService.healthCheck()
  }
}
