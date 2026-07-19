import type { StepExecutor, RowBatch, ExecutionContext, WorkflowStepInput, ProviderCapability, ProviderHealthStatus } from '../types'
import type { ColumnDef } from '../../ai/types'
import { linkupService } from '../../services/linkup'

const SEARCH_COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'url', label: 'URL', type: 'url' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'snippet', label: 'Snippet', type: 'text' },
  { key: 'publishedDate', label: 'Published', type: 'text' },
]

export class LinkupProvider implements StepExecutor {
  id = 'linkup'
  name = 'LinkUp'
  description = 'Real-time web search for business data and contact information'
  type = 'builtin' as const
  capabilities: ProviderCapability[] = ['search', 'custom']

  isAvailable(): boolean {
    return linkupService.isAvailable()
  }

  canExecute(step: WorkflowStepInput): boolean {
    if (step.provider === 'linkup') return true
    const desc = (step.description ?? '').toLowerCase()
    return step.stepType === 'search' && (desc.includes('company') || desc.includes('find') || desc.includes('search'))
  }

  async *execute(step: WorkflowStepInput, context: ExecutionContext): AsyncIterable<RowBatch> {
    try {
      const query = (step.config?.query as string) || step.description || ''
      const limit = (step.config?.limit as number) || 20

      if (!query.trim()) {
        yield {
          rows: [],
          batchIndex: 0,
          totalSoFar: 0,
        }
        return
      }

      // Execute search
      const results = await linkupService.search(query, { limit })

      // Convert results to rows
      const rows = results.results.map(r => ({
        title: r.title,
        url: r.url,
        description: r.description,
        snippet: r.snippet,
        publishedDate: r.publishedDate,
        source: r.source,
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
      console.error(`LinkUp execution error: ${err instanceof Error ? err.message : String(err)}`)
      yield {
        rows: [],
        batchIndex: 0,
        totalSoFar: 0,
      }
    }
  }

  getColumnDefinitions(_step: WorkflowStepInput): ColumnDef[] {
    return SEARCH_COLUMNS
  }

  async selfHealthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isAvailable()) {
      return {
        status: 'warn',
        detail: 'LINKUP_API_KEY not set',
      }
    }

    const check = await linkupService.healthCheck()
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
    return linkupService.healthCheck()
  }
}
