/**
 * /api/chat/* — natural-language chat surface backed by real skill execution.
 *
 * A user message is routed by Claude (tool-calling over every registered
 * skill's own inputSchema — see ../../ai/skill-router.ts) to at most one
 * skill per turn. Non-mutating skills (find/enrich/qualify/research/...)
 * execute immediately and stream their SkillEvents back over SSE.
 * Mutating skills (send-email-sequence, orchestrate, multi-channel-campaign,
 * answer-comments, track-campaign) instead emit `confirm_needed` and wait
 * for an explicit follow-up confirm call — this repo's hard rule is that no
 * outbound send fires without the user saying yes first.
 *
 * The browser's native EventSource only supports GET, so the confirm step
 * reuses the same /stream endpoint in a second mode (confirmSkillId +
 * confirmInput instead of message) rather than a POST the client can't
 * open as SSE.
 *
 * Endpoints:
 *   POST /api/chat/conversations              — create a conversation, returns { id }
 *   GET  /api/chat/conversations               — list conversations (most recent first)
 *   GET  /api/chat/conversations/:id/messages   — full message history for one conversation
 *   GET  /api/chat/stream?conversationId=&message=  — SSE: persist message, route + execute
 *   GET  /api/chat/stream?conversationId=&confirmSkillId=&confirmInput=  — SSE: execute a confirmed skill
 */

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { randomUUID } from 'node:crypto'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../db'
import { conversations, messages } from '../../db/schema'
import {
  buildSkillTools,
  buildChatSystemPrompt,
  skillIdForToolName,
  MUTATING_SKILL_IDS,
} from '../../ai/skill-router'
import type { SkillEvent } from '../../skills/types'

export const chatRoutes = new Hono()

// ─── POST /conversations ─────────────────────────────────────────────────

chatRoutes.post('/conversations', async (c) => {
  const id = randomUUID()
  const title = 'New Conversation'
  const createdAt = new Date()
  await db.insert(conversations).values({ id, title, createdAt, updatedAt: createdAt })
  return c.json({ id, title, createdAt })
})

// ─── GET /conversations ──────────────────────────────────────────────────

chatRoutes.get('/conversations', async (c) => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.updatedAt))
    .limit(50)
  return c.json({ conversations: rows })
})

// ─── GET /conversations/:id/messages ─────────────────────────────────────

chatRoutes.get('/conversations/:id/messages', async (c) => {
  const conversationId = c.req.param('id')
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
  return c.json({ messages: rows })
})

// ─── Shared: input validation against a skill's inputSchema ──────────────

function missingRequiredInputs(
  inputSchema: Record<string, unknown> | undefined,
  input: Record<string, unknown>,
): string[] {
  const schema = inputSchema ?? {}
  const required = (schema.required as string[] | undefined) ?? []
  return required.filter((k) => input[k] === undefined || input[k] === null || input[k] === '')
}

// ─── Shared: run a skill, forwarding its events over an SSE stream ───────

async function runSkillOverSse(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  skillId: string,
  input: Record<string, unknown>,
): Promise<{ resultSummary: unknown[]; errorMessage: string | null }> {
  const { getSkillRegistryReady } = await import('../../skills/registry.js')
  const { getRegistryReady } = await import('../../providers/registry.js')
  const registry = await getSkillRegistryReady()
  const skill = registry.get(skillId)
  const resultSummary: unknown[] = []
  let errorMessage: string | null = null

  if (!skill) {
    errorMessage = `Unknown skill "${skillId}".`
    await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: errorMessage }) })
    return { resultSummary, errorMessage }
  }

  const providers = await getRegistryReady()
  const context = { framework: null, intelligence: [], providers, userId: 'default' }

  await stream.writeSSE({ event: 'tool_start', data: JSON.stringify({ skillId, input }) })

  try {
    for await (const event of skill.execute(input, context as never) as AsyncIterable<SkillEvent>) {
      await stream.writeSSE({ event: event.type, data: JSON.stringify(event) })
      if (event.type === 'result') resultSummary.push(event.data)
      if (event.type === 'error') errorMessage = event.message
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'skill threw'
    await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: errorMessage }) })
  }

  return { resultSummary, errorMessage }
}

// ─── GET /stream ──────────────────────────────────────────────────────────

chatRoutes.get('/stream', async (c) => {
  const conversationId = c.req.query('conversationId')
  const userMessage = c.req.query('message')
  const confirmSkillId = c.req.query('confirmSkillId')
  const confirmInputRaw = c.req.query('confirmInput')

  if (!conversationId) {
    return c.json({ error: 'missing_params', message: 'conversationId is required.' }, 400)
  }

  // ─── Confirm mode: execute a previously-proposed mutating skill ────────
  if (confirmSkillId) {
    if (!MUTATING_SKILL_IDS.has(confirmSkillId)) {
      return c.json(
        { error: 'not_mutating', message: `"${confirmSkillId}" does not require confirmation.` },
        400,
      )
    }
    let confirmInput: Record<string, unknown>
    try {
      confirmInput = confirmInputRaw ? JSON.parse(confirmInputRaw) : {}
    } catch {
      return c.json({ error: 'bad_input', message: 'confirmInput must be valid JSON.' }, 400)
    }

    return streamSSE(c, async (stream) => {
      const { errorMessage } = await runSkillOverSse(stream, confirmSkillId, confirmInput)

      await db.insert(messages).values({
        conversationId,
        role: 'assistant',
        content: errorMessage ? `${confirmSkillId} failed: ${errorMessage}` : `Ran ${confirmSkillId}.`,
        messageType: 'table',
        metadata: { skillId: confirmSkillId },
      })
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId))

      await stream.writeSSE({ event: 'done', data: JSON.stringify({}) })
    })
  }

  // ─── Normal mode: route the user's message through Claude ──────────────
  if (!userMessage) {
    return c.json({ error: 'missing_params', message: 'message is required.' }, 400)
  }

  return streamSSE(c, async (stream) => {
    // Persist the user's turn.
    await db.insert(messages).values({
      conversationId,
      role: 'user',
      content: userMessage,
      messageType: 'text',
    })

    // First-turn title derivation.
    const existing = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
    const isFirstTurn = existing.length <= 1
    const history = existing.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }))

    let assistantText = ''
    let ranSkillId: string | null = null
    let confirmPending = false
    let routingError: string | null = null

    try {
      const { getSkillRegistryReady } = await import('../../skills/registry.js')
      const { getAnthropicClient, PLANNER_MODEL } = await import('../../ai/client.js')
      const registry = await getSkillRegistryReady()
      const skillList = registry.list()
      const tools = buildSkillTools(skillList)
      const client = getAnthropicClient()

      const res = await client.messages.create({
        model: PLANNER_MODEL,
        max_tokens: 1024,
        system: buildChatSystemPrompt(),
        tools,
        messages: history,
      })

      for (const block of res.content) {
        if (block.type === 'text') {
          assistantText += block.text
          await stream.writeSSE({ event: 'text_delta', data: JSON.stringify({ content: block.text }) })
        } else if (block.type === 'tool_use') {
          const skillId = skillIdForToolName(block.name, skillList)
          if (!skillId) {
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify({ message: `Model picked unknown tool "${block.name}".` }),
            })
            continue
          }
          const input = block.input as Record<string, unknown>
          const skillMeta = skillList.find((s) => s.id === skillId)
          const missing = missingRequiredInputs(skillMeta?.inputSchema as Record<string, unknown>, input)
          if (missing.length > 0) {
            await stream.writeSSE({
              event: 'error',
              data: JSON.stringify({ message: `Missing required input(s) for ${skillId}: ${missing.join(', ')}` }),
            })
            continue
          }

          if (MUTATING_SKILL_IDS.has(skillId)) {
            confirmPending = true
            await stream.writeSSE({
              event: 'confirm_needed',
              data: JSON.stringify({ skillId, input }),
            })
          } else {
            ranSkillId = skillId
            await runSkillOverSse(stream, skillId, input)
          }
        }
      }
    } catch (err) {
      routingError = err instanceof Error ? err.message : 'chat routing failed'
      await stream.writeSSE({ event: 'error', data: JSON.stringify({ message: routingError }) })
    }

    // Persist the assistant's turn (skip when we're only waiting on a confirm —
    // the real assistant message lands once /confirm actually runs the skill).
    if (!confirmPending) {
      await db.insert(messages).values({
        conversationId,
        role: 'assistant',
        content: assistantText || (ranSkillId ? `Ran ${ranSkillId}.` : routingError ? `Error: ${routingError}` : ''),
        messageType: ranSkillId ? 'table' : 'text',
        metadata: ranSkillId ? { skillId: ranSkillId } : null,
      })
    }

    await db
      .update(conversations)
      .set({
        updatedAt: new Date(),
        ...(isFirstTurn ? { title: userMessage.slice(0, 60) } : {}),
      })
      .where(eq(conversations.id, conversationId))

    await stream.writeSSE({ event: 'done', data: JSON.stringify({}) })
  })
})
