import type { StepExecutor, RowBatch, ExecutionContext, WorkflowStepInput, ProviderCapability, ProviderHealthStatus } from '../types'
import type { ColumnDef } from '../../ai/types'
import { apifyService } from '../../services/apify'

const SCRAPE_COLUMNS: ColumnDef[] = [
  { key: 'url', label: 'URL', type: 'url' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'text', label: 'Content', type: 'text' },
  { key: 'data', label: 'Extracted Data', type: 'text' },
]

const SEARCH_COLUMNS: ColumnDef[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'url', label: 'URL', type: 'url' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'relevance', label: 'Relevance', type: 'score' },
]

export class ApifyProvider implements StepExecutor {
  id = 'apify'
  name = 'Apify'
  description = 'Web scraping and data extraction via Apify actors'
  type = 'builtin' as const
  capabilities: ProviderCapability[] = ['search', 'enrich', 'custom']

  isAvailable(): boolean {
    return apifyService.isAvailable()
  }

  canExecute(step: WorkflowStepInput): boolean {
    if (step.provider === 'apify') return true
    const desc = (step.description ?? '').toLowerCase()
    return (desc.includes('scrape') || desc.includes('extract') || desc.includes('crawl'))
  }

  async *execute(step: WorkflowStepInput, context: ExecutionContext): AsyncIterable<RowBatch> {
    try {
      // Get actor ID and input from config
      const actorId = (step.config?.actorId as string) || 'apify/google-search-scraper'
      const actorInput = (step.config?.input as Record<string, unknown>) || {
        queries: [step.description],
        maxResults: 10,
      }

      // Run the actor
      const run = await apifyService.runActor(actorId, actorInput)

      // Wait for completion
      const completedRun = await apifyService.waitForRun(run.id)

      if (completedRun.status !== 'SUCCEEDED') {
        console.error(`Apify actor ${actorId} failed with status ${completedRun.status}`)
        yield {
          rows: [],
          batchIndex: 0,
          totalSoFar: 0,
        }
        return
      }

      // Get results from dataset
      const items = await apifyService.getDatasetItems(completedRun.datasetId, 100)

      // Batch the results
      const batchSize = context.batchSize || 25
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        yield {
          rows: batch,
          batchIndex: Math.floor(i / batchSize),
          totalSoFar: Math.min(i + batchSize, items.length),
        }
      }
    } catch (err) {
      console.error(`Apify execution error: ${err instanceof Error ? err.message : String(err)}`)
      yield {
        rows: [],
        batchIndex: 0,
        totalSoFar: 0,
      }
    }
  }

  getColumnDefinitions(step: WorkflowStepInput): ColumnDef[] {
    const desc = (step.description ?? '').toLowerCase()
    if (desc.includes('scrape') || desc.includes('extract')) {
      return SCRAPE_COLUMNS
    }
    return SEARCH_COLUMNS
  }

  async selfHealthCheck(): Promise<ProviderHealthStatus> {
    if (!this.isAvailable()) {
      return {
        status: 'warn',
        detail: 'APIFY_API_KEY not set',
      }
    }

    const check = await apifyService.healthCheck()
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
    return apifyService.healthCheck()
  }
}
