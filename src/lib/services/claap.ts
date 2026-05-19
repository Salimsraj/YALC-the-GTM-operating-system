import { cachedFetch, withCache } from '../cache/cached-fetch'

const CACHE_SCOPE = 'claap'
const BASE = 'https://api.claap.io'

/**
 * Required env vars for the Claap provider. Doctor walks this schema to
 * surface missing credentials at startup.
 */
export const envVarSchema = {
  CLAAP_API_KEY: { minLength: 20 },
} as const

export interface ClaapParticipant {
  id?: string
  name?: string
  email?: string
  internal?: boolean
}

export interface ClaapMoment {
  type: 'objection' | 'competitor_mention' | 'feature_request' | 'action_item' | 'next_step_promised' | string
  text?: string
  speaker?: string
  start_sec?: number
  end_sec?: number
}

export interface ClaapCall {
  id: string
  title?: string
  call_time: string
  duration_sec: number
  recording_url?: string
  participants?: ClaapParticipant[]
  crm_link?: { provider: string; record_id: string } | null
}

export interface ClaapTranscript {
  call_id: string
  text: string
  summary?: string
  language?: string
  moments?: ClaapMoment[]
}

function headers(): Record<string, string> {
  const key = process.env.CLAAP_API_KEY
  if (!key) throw new Error('CLAAP_API_KEY must be set')
  return {
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

export class ClaapService {
  isAvailable(): boolean {
    return !!process.env.CLAAP_API_KEY
  }

  async listCalls(opts: { since?: Date; limit?: number } = {}): Promise<ClaapCall[]> {
    const params = new URLSearchParams()
    if (opts.since) params.set('since', opts.since.toISOString())
    if (opts.limit) params.set('limit', String(opts.limit))
    const url = `${BASE}/v1/calls${params.toString() ? `?${params}` : ''}`
    return withCache(
      { scope: CACHE_SCOPE, key: `listCalls:${params.toString()}`, ttlMs: 60_000 },
      async () => {
        const res = await cachedFetch(url, { headers: headers() }, { scope: CACHE_SCOPE })
        if (!res.ok) throw new Error(`Claap listCalls failed (${res.status}): ${await res.text()}`)
        const body = (await res.json()) as { calls?: ClaapCall[] } | ClaapCall[]
        return Array.isArray(body) ? body : (body.calls ?? [])
      },
    )
  }

  async getCall(callId: string): Promise<ClaapCall> {
    return withCache(
      { scope: CACHE_SCOPE, key: `getCall:${callId}`, ttlMs: 3_600_000 },
      async () => {
        const res = await cachedFetch(`${BASE}/v1/calls/${encodeURIComponent(callId)}`, { headers: headers() }, { scope: CACHE_SCOPE })
        if (!res.ok) throw new Error(`Claap getCall failed (${res.status}): ${await res.text()}`)
        return (await res.json()) as ClaapCall
      },
    )
  }

  async getTranscript(callId: string): Promise<ClaapTranscript> {
    return withCache(
      { scope: CACHE_SCOPE, key: `getTranscript:${callId}`, ttlMs: 86_400_000 },
      async () => {
        const res = await cachedFetch(`${BASE}/v1/calls/${encodeURIComponent(callId)}/transcript`, { headers: headers() }, { scope: CACHE_SCOPE })
        if (!res.ok) throw new Error(`Claap getTranscript failed (${res.status}): ${await res.text()}`)
        return (await res.json()) as ClaapTranscript
      },
    )
  }

  /**
   * Register a webhook subscription with Claap so transcript-ready events
   * land on our Hono inbound route. Idempotent server-side per Claap docs.
   */
  async registerWebhook(callbackUrl: string, events: string[] = ['call.transcript_ready']): Promise<{ id: string }> {
    const res = await cachedFetch(`${BASE}/v1/webhooks`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ url: callbackUrl, events }),
    }, { scope: CACHE_SCOPE, bypass: true })
    if (!res.ok) throw new Error(`Claap registerWebhook failed (${res.status}): ${await res.text()}`)
    return (await res.json()) as { id: string }
  }
}

export const claapService = new ClaapService()
