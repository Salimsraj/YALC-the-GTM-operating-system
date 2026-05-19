import { Hono } from 'hono'
import { db } from '../../db'
import { callRecordings, callTranscripts } from '../../db/schema'
import { claapService } from '../../services/claap'
import { eq, and } from 'drizzle-orm'

export const claapWebhookRoutes = new Hono()

interface ClaapWebhookPayload {
  event: string
  call_id: string
  tenant_slug?: string
}

/**
 * Inbound webhook receiver for Claap. Configure Claap to POST here whenever
 * `call.transcript_ready` fires; the handler pulls the full transcript + call
 * metadata and persists it for orchestrator-skill consumption.
 */
claapWebhookRoutes.post('/', async (c) => {
  let payload: ClaapWebhookPayload
  try {
    payload = await c.req.json<ClaapWebhookPayload>()
  } catch {
    return c.json({ error: 'invalid json' }, 400)
  }

  if (!payload?.event || !payload?.call_id) {
    return c.json({ error: 'event and call_id required' }, 400)
  }

  if (payload.event !== 'call.transcript_ready') {
    // Other Claap events are accepted but no-op for now.
    return c.json({ ok: true, skipped: payload.event })
  }

  const tenantId = payload.tenant_slug ?? 'default'

  // Fetch call + transcript in parallel
  const [call, transcript] = await Promise.all([
    claapService.getCall(payload.call_id),
    claapService.getTranscript(payload.call_id),
  ])

  // Upsert recording row
  const existing = await db
    .select()
    .from(callRecordings)
    .where(and(eq(callRecordings.provider, 'claap'), eq(callRecordings.providerCallId, payload.call_id)))
    .limit(1)

  const callTime = new Date(call.call_time)
  let recordingId: string
  if (existing.length === 0) {
    recordingId = crypto.randomUUID()
    await db.insert(callRecordings).values({
      id: recordingId,
      tenantId,
      provider: 'claap',
      providerCallId: payload.call_id,
      recordingUrl: call.recording_url ?? null,
      callTime,
      durationSec: call.duration_sec ?? 0,
      participantCount: call.participants?.length ?? 0,
      participants: call.participants ?? [],
    })
  } else {
    recordingId = existing[0].id
  }

  // Upsert transcript row
  const existingTranscript = await db
    .select()
    .from(callTranscripts)
    .where(eq(callTranscripts.callRecordingId, recordingId))
    .limit(1)

  if (existingTranscript.length === 0) {
    await db.insert(callTranscripts).values({
      id: crypto.randomUUID(),
      callRecordingId: recordingId,
      text: transcript.text,
      summary: transcript.summary ?? null,
      moments: transcript.moments ?? [],
      language: transcript.language ?? 'en',
    })
  } else {
    await db
      .update(callTranscripts)
      .set({
        text: transcript.text,
        summary: transcript.summary ?? null,
        moments: transcript.moments ?? [],
        language: transcript.language ?? 'en',
        ingestedAt: new Date(),
      })
      .where(eq(callTranscripts.callRecordingId, recordingId))
  }

  return c.json({ ok: true, recording_id: recordingId })
})
