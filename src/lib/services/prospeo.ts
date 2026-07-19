/**
 * Prospeo API Service
 * Find people, emails, and phone numbers for B2B outreach
 */

import { cachedFetch } from '../cache/cached-fetch'

export interface ProspeoContact {
  name?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  linkedin_url?: string
  confidence?: number
  [key: string]: unknown
}

export interface ProspeoSearchResult {
  success: boolean
  data?: ProspeoContact[]
  credits_used?: number
  error?: string
}

export class ProspeoService {
  private apiKey: string
  private baseUrl = 'https://api.prospeo.io/v2'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.PROSPEO_API_KEY || ''
  }

  isAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Find people at a company by name, title, or email
   */
  async findPeople(params: {
    company?: string
    first_name?: string
    last_name?: string
    domain?: string
    title?: string
    limit?: number
  }): Promise<ProspeoContact[]> {
    if (!this.isAvailable()) {
      throw new Error('PROSPEO_API_KEY not set')
    }

    try {
      const queryParams = new URLSearchParams({
        api_key: this.apiKey,
        ...Object.entries(params).reduce(
          (acc, [k, v]) => {
            if (v !== undefined && v !== null) acc[k] = String(v)
            return acc
          },
          {} as Record<string, string>
        ),
      })

      const response = await cachedFetch(
        `${this.baseUrl}/people/search?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        },
        { scope: 'prospeo', ttlMs: 0 }
      )

      if (!response.ok) {
        throw new Error(`Prospeo API error: ${response.status}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (err) {
      throw new Error(`Prospeo search failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * Enrich a person with email and phone
   */
  async enrichPerson(params: {
    first_name: string
    last_name: string
    company?: string
    domain?: string
    linkedin_url?: string
  }): Promise<ProspeoContact | null> {
    if (!this.isAvailable()) {
      throw new Error('PROSPEO_API_KEY not set')
    }

    try {
      const queryParams = new URLSearchParams({
        api_key: this.apiKey,
        ...Object.entries(params).reduce(
          (acc, [k, v]) => {
            if (v !== undefined && v !== null) acc[k] = String(v)
            return acc
          },
          {} as Record<string, string>
        ),
      })

      const response = await cachedFetch(
        `${this.baseUrl}/people/enrich?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        },
        { scope: 'prospeo', ttlMs: 0 }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.data || null
    } catch (err) {
      console.error(`Prospeo enrichment error: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  /**
   * Batch enrich multiple people
   */
  async enrichBatch(people: Array<{ first_name: string; last_name: string; company?: string }>): Promise<ProspeoContact[]> {
    if (!this.isAvailable()) {
      throw new Error('PROSPEO_API_KEY not set')
    }

    const results: ProspeoContact[] = []

    for (const person of people) {
      try {
        const enriched = await this.enrichPerson(person)
        if (enriched) {
          results.push(enriched)
        }
      } catch {
        // Skip on error
      }
    }

    return results
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    if (!this.isAvailable()) {
      return { ok: false, message: 'PROSPEO_API_KEY not set' }
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/credits?api_key=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      )

      if (response.ok) {
        return { ok: true, message: 'Prospeo API is healthy' }
      }
      if (response.status === 401 || response.status === 403) {
        return { ok: false, message: 'Prospeo API key invalid' }
      }
      return { ok: false, message: `Prospeo API returned ${response.status}` }
    } catch (err) {
      return {
        ok: false,
        message: `Prospeo connection failed: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}

export const prospeoService = new ProspeoService()
