/**
 * Apify Web Scraping Service
 * Uses Apify actors for data extraction and web scraping
 */

import { cachedFetch } from '../cache/cached-fetch'

export interface ApifyActorRun {
  id: string
  actId: string
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'ABORTED'
  startedAt: string
  finishedAt?: string
  datasetId: string
}

export interface ApifyDatasetItem {
  [key: string]: unknown
}

export class ApifyService {
  private apiKey: string
  private baseUrl = 'https://api.apify.com/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.APIFY_API_KEY || ''
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async runActor(actorId: string, input: Record<string, unknown>): Promise<ApifyActorRun> {
    if (!this.isAvailable()) {
      throw new Error('APIFY_API_KEY not set')
    }

    try {
      const response = await cachedFetch(
        `${this.baseUrl}/acts/${actorId}/runs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({ input }),
        },
        { scope: 'apify', ttlMs: 0 }
      )

      if (!response.ok) {
        throw new Error(`Apify API error: ${response.status}`)
      }

      const data = await response.json()
      return data.data as ApifyActorRun
    } catch (err) {
      throw new Error(`Apify run failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async waitForRun(runId: string, maxWaitMs: number = 60000): Promise<ApifyActorRun> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const response = await cachedFetch(
        `${this.baseUrl}/runs/${runId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        { scope: 'apify', ttlMs: 0 }
      )

      const data = await response.json()
      const run = data.data as ApifyActorRun

      if (run.status === 'SUCCEEDED' || run.status === 'FAILED') {
        return run
      }

      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    throw new Error('Apify run timeout')
  }

  async getDatasetItems(datasetId: string, limit: number = 100): Promise<ApifyDatasetItem[]> {
    if (!this.isAvailable()) {
      throw new Error('APIFY_API_KEY not set')
    }

    try {
      const response = await cachedFetch(
        `${this.baseUrl}/datasets/${datasetId}/items?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
        { scope: 'apify', ttlMs: 0 }
      )

      if (!response.ok) {
        throw new Error(`Failed to get dataset items: ${response.status}`)
      }

      const data = await response.json()
      return data as ApifyDatasetItem[]
    } catch (err) {
      throw new Error(`Failed to fetch dataset: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'APIFY_API_KEY not set' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        return { ok: true, message: 'Apify API is healthy' }
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: 'Apify API key invalid' }
      }
      return { ok: false, message: `Apify API returned ${response.status}` }
    } catch (err) {
      return {
        ok: false,
        message: `Apify connection failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}

export const apifyService = new ApifyService()
