/**
 * LinkUp API Service
 * Real-time web search for business data and contact information
 */

import { cachedFetch } from '../cache/cached-fetch'

export interface LinkupSearchResult {
  url: string
  title: string
  description: string
  snippet: string
  source?: string
  publishedDate?: string
  [key: string]: unknown
}

export interface LinkupSearchResponse {
  results: LinkupSearchResult[]
  totalResults: number
  searchTime: number
}

export class LinkupService {
  private apiKey: string
  private baseUrl = 'https://api.linkup.so'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.LINKUP_API_KEY || ''
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async search(query: string, options?: {
    limit?: number
    freshness?: 'day' | 'week' | 'month'
  }): Promise<LinkupSearchResponse> {
    if (!this.isAvailable()) {
      throw new Error('LINKUP_API_KEY not set')
    }

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(options?.limit || 10),
      })

      if (options?.freshness) {
        params.append('freshness', options.freshness)
      }

      const response = await cachedFetch(
        `${this.baseUrl}/search?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
          },
        },
        { scope: 'linkup', ttlMs: 0 }
      )

      if (!response.ok) {
        throw new Error(`LinkUp API error: ${response.status}`)
      }

      const data = await response.json()
      return data as LinkupSearchResponse
    } catch (err) {
      throw new Error(`LinkUp search failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async searchCompanies(companyName: string, limit?: number): Promise<LinkupSearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('LINKUP_API_KEY not set')
    }

    try {
      const query = `"${companyName}" company website contact information`
      const response = await this.search(query, { limit: limit || 20 })
      return response.results
    } catch (err) {
      throw new Error(`Company search failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async searchPeople(name: string, company?: string, limit?: number): Promise<LinkupSearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('LINKUP_API_KEY not set')
    }

    try {
      const query = company ? `"${name}" "${company}" email linkedin` : `"${name}" email contact`
      const response = await this.search(query, { limit: limit || 15 })
      return response.results
    } catch (err) {
      throw new Error(`People search failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'LINKUP_API_KEY not set' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        return { ok: true, message: 'LinkUp API is healthy' }
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: 'LinkUp API key invalid' }
      }
      return { ok: false, message: `LinkUp API returned ${response.status}` }
    } catch (err) {
      return {
        ok: false,
        message: `LinkUp connection failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}

export const linkupService = new LinkupService()
