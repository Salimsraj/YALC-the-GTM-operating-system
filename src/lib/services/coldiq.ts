/**
 * ColdIQ Unified API Service
 * Wraps ColdIQ's 39-provider orchestration API
 */

import { cachedFetch } from '../cache/cached-fetch'

export interface ColdIQQueryResult {
  success: boolean
  data: Record<string, unknown>[]
  credits_used: number
  error?: string
}

export interface ColdIQContact {
  name?: string
  title?: string
  email?: string
  company?: string
  linkedin?: string
  status?: string
  [key: string]: unknown
}

export class ColdIQService {
  private apiKey: string
  private baseUrl = 'https://api.coldiq.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.COLDIQ_API_KEY || ''
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async query(queryText: string): Promise<ColdIQQueryResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        data: [],
        credits_used: 0,
        error: 'COLDIQ_API_KEY not set',
      }
    }

    try {
      const response = await cachedFetch(
        `${this.baseUrl}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            query: queryText,
            return_format: 'structured',
          }),
        },
        { scope: 'coldiq', ttlMs: 0 } // Cache forever, no freshness needed
      )

      if (!response.ok) {
        const text = await response.text()
        return {
          success: false,
          data: [],
          credits_used: 0,
          error: `HTTP ${response.status}: ${text}`,
        }
      }

      const result = await response.json() as ColdIQQueryResult
      return result
    } catch (err) {
      return {
        success: false,
        data: [],
        credits_used: 0,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'COLDIQ_API_KEY not set' }
    }

    // ColdIQ doesn't have a dedicated health endpoint, so just verify the API key exists
    return { ok: true, message: 'ColdIQ API key is configured' }
  }
}

export const coldiqService = new ColdIQService()
