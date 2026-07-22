/**
 * /chat — natural-language surface over Outbound OS's skill catalog (C-series).
 *
 * Modeled on the ColdIQ chat UI reference: a persistent sidebar (AppShell)
 * plus a centered transcript + input. Each send opens a fresh, one-shot
 * EventSource against /api/chat/stream — it's not a long-lived connection
 * like /today's, so we close it ourselves the moment `done`/`error` arrives
 * to avoid the browser's default auto-reconnect re-firing the same query.
 */
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { SecondBrain } from '@/components/SecondBrain'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ResultTable, extractRows, type Row } from '@/components/ResultTable'
import { StructuredValue } from '@/lib/render'
import { api } from '@/lib/api'
import { describeError } from '@/lib/feedback'

interface TranscriptItem {
  id: string
  role: 'user' | 'assistant'
  kind: 'text' | 'tool_run' | 'confirm' | 'error'
  content?: string
  skillId?: string
  input?: Record<string, unknown>
  progress?: { message: string; percent: number } | null
  results?: unknown[]
  status?: 'running' | 'done' | 'error' | 'awaiting_confirm' | 'confirmed' | 'declined'
  errorMessage?: string
}

const SUGGESTIONS = [
  'Find sales leaders at HubSpot',
  'Qualify these leads against my ICP',
  'Research the company at stripe.com',
  'What campaigns are currently active?',
]

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())
}

export function Chat() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [items, setItems] = useState<TranscriptItem[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  useEffect(() => {
    return () => {
      esRef.current?.close()
    }
  }, [])

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId
    const res = await api.post<{ id: string }>('/api/chat/conversations')
    setConversationId(res.id)
    return res.id
  }

  async function loadConversation(id: string) {
    setLoadError(null)
    try {
      const res = await api.get<{
        messages: Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string; messageType: string }>
      }>(`/api/chat/conversations/${id}/messages`)
      setConversationId(id)
      setItems(
        res.messages
          .filter((m): m is typeof m & { role: 'user' | 'assistant' } => m.role !== 'system')
          .map((m) => ({
            id: m.id,
            role: m.role,
            kind: 'text' as const,
            content: m.content,
            status: 'done' as const,
          })),
      )
    } catch (err) {
      setLoadError(describeError(err, 'Failed to load conversation'))
    }
  }

  function startNewConversation() {
    esRef.current?.close()
    setConversationId(null)
    setItems([])
    setInput('')
  }

  function appendItem(item: TranscriptItem) {
    setItems((prev) => [...prev, item])
  }

  function patchItem(id: string, patch: Partial<TranscriptItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function openStream(url: string, onDone: () => void) {
    esRef.current?.close()
    const es = new EventSource(url)
    esRef.current = es
    let activeToolItemId: string | null = null

    const close = () => {
      es.close()
      if (esRef.current === es) esRef.current = null
    }

    es.addEventListener('text_delta', (ev: MessageEvent) => {
      const data = JSON.parse(ev.data) as { content: string }
      appendItem({ id: newId(), role: 'assistant', kind: 'text', content: data.content, status: 'done' })
    })

    es.addEventListener('tool_start', (ev: MessageEvent) => {
      const data = JSON.parse(ev.data) as { skillId: string; input: Record<string, unknown> }
      const id = newId()
      activeToolItemId = id
      appendItem({
        id,
        role: 'assistant',
        kind: 'tool_run',
        skillId: data.skillId,
        input: data.input,
        progress: null,
        results: [],
        status: 'running',
      })
    })

    es.addEventListener('progress', (ev: MessageEvent) => {
      if (!activeToolItemId) return
      const data = JSON.parse(ev.data) as { message: string; percent: number }
      patchItem(activeToolItemId, { progress: data })
    })

    es.addEventListener('result', (ev: MessageEvent) => {
      if (!activeToolItemId) return
      const data = JSON.parse(ev.data) as { data: unknown }
      setItems((prev) =>
        prev.map((it) =>
          it.id === activeToolItemId ? { ...it, results: [...(it.results ?? []), data.data] } : it,
        ),
      )
    })

    es.addEventListener('approval_needed', (ev: MessageEvent) => {
      const data = JSON.parse(ev.data) as { title: string; description: string; payload: unknown }
      appendItem({
        id: newId(),
        role: 'assistant',
        kind: 'text',
        content: `Needs approval: ${data.title} — ${data.description}`,
        status: 'done',
      })
    })

    es.addEventListener('confirm_needed', (ev: MessageEvent) => {
      const data = JSON.parse(ev.data) as { skillId: string; input: Record<string, unknown> }
      appendItem({
        id: newId(),
        role: 'assistant',
        kind: 'confirm',
        skillId: data.skillId,
        input: data.input,
        status: 'awaiting_confirm',
      })
    })

    es.addEventListener('error', (ev: MessageEvent) => {
      let message = 'Something went wrong.'
      try {
        message = (JSON.parse(ev.data) as { message: string }).message
      } catch {
        // keep default
      }
      if (activeToolItemId) {
        patchItem(activeToolItemId, { status: 'error', errorMessage: message })
      } else {
        appendItem({ id: newId(), role: 'assistant', kind: 'error', errorMessage: message, status: 'error' })
      }
    })

    es.addEventListener('done', () => {
      if (activeToolItemId) patchItem(activeToolItemId, { status: 'done' })
      close()
      onDone()
    })

    // A real connection error (not our own `close()` above) — stop instead
    // of letting EventSource auto-reconnect and replay the same query.
    es.onerror = () => {
      close()
      onDone()
    }
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInput('')
    const convId = await ensureConversation()
    appendItem({ id: newId(), role: 'user', kind: 'text', content: trimmed, status: 'done' })

    const url = `/api/chat/stream?conversationId=${encodeURIComponent(convId)}&message=${encodeURIComponent(trimmed)}`
    openStream(url, () => {
      setSending(false)
      setSidebarRefreshKey((k) => k + 1)
    })
  }

  async function handleConfirm(item: TranscriptItem, confirmed: boolean) {
    if (!conversationId || !item.skillId) return
    if (!confirmed) {
      patchItem(item.id, { status: 'declined' })
      return
    }
    patchItem(item.id, { status: 'confirmed' })
    setSending(true)
    const url =
      `/api/chat/stream?conversationId=${encodeURIComponent(conversationId)}` +
      `&confirmSkillId=${encodeURIComponent(item.skillId)}` +
      `&confirmInput=${encodeURIComponent(JSON.stringify(item.input ?? {}))}`
    openStream(url, () => {
      setSending(false)
      setSidebarRefreshKey((k) => k + 1)
    })
  }

  return (
    <AppShell
      activeConversationId={conversationId}
      onSelectConversation={(id) => void loadConversation(id)}
      onNewConversation={startNewConversation}
      onSkillClick={(_, skillName) => {
        setInput(skillName)
      }}
      refreshKey={sidebarRefreshKey}
    >
      <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
        <div className="flex-1 overflow-y-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-0">
            {items.length === 0 && (
              <div className="text-center py-20">
                <h1 className="font-heading text-4xl font-bold tracking-tight mb-3 text-gray-900 dark:text-white">
                  Ask for GTM data in plain English
                </h1>
                <p className="text-base text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
                  Find companies, find people, enrich leads, qualify against your ICP, and more — from one chat.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void handleSend(s)}
                      className="text-left rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadError && <p className="text-sm text-destructive">{loadError}</p>}

            {items.map((item) => (
              <TranscriptCard key={item.id} item={item} onConfirm={handleConfirm} />
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-4">
          <div className="max-w-3xl mx-auto mb-4">
            <SecondBrain />
          </div>

          <form
            className="max-w-3xl mx-auto flex gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSend(input)
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend(input)
                }
              }}
              placeholder="Ask Outbound OS to find companies, people, emails, or run a skill..."
              rows={1}
              disabled={sending}
              className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-white disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-4 py-3"
            >
              {sending ? 'Working…' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}

function TranscriptCard({
  item,
  onConfirm,
}: {
  item: TranscriptItem
  onConfirm: (item: TranscriptItem, confirmed: boolean) => void
}) {
  const isUser = item.role === 'user'

  if (item.kind === 'text') {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`max-w-2xl ${
            isUser
              ? 'bg-orange-500 text-white rounded-2xl px-4 py-2.5 text-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-foreground rounded-2xl px-4 py-2.5 text-sm'
          }`}
        >
          {item.content}
        </div>
      </div>
    )
  }

  if (item.kind === 'error') {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{item.errorMessage}</p>
        </CardContent>
      </Card>
    )
  }

  if (item.kind === 'confirm') {
    return (
      <Card className="border-amber-500/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Confirm: {item.skillId}</CardTitle>
              <CardDescription>This action sends or publishes something. Review before running.</CardDescription>
            </div>
            <Badge variant="outline">
              {item.status === 'awaiting_confirm' ? 'awaiting confirm' : item.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border bg-background/40 p-3">
            <StructuredValue value={item.input ?? {}} />
          </div>
          {item.status === 'awaiting_confirm' && (
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => onConfirm(item, false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => onConfirm(item, true)}>
                Confirm & run
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // tool_run
  return <StepCard item={item} />
}

/** Humanize a skill id for the step-card title: `find-companies` → `Find Companies`. */
function skillTitle(skillId: string | undefined): string {
  if (!skillId) return 'Skill'
  return skillId
    .replace(/^md:/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * ColdIQ-style step card: icon + skill name + status line on the left,
 * DONE/RUNNING chip + chevron on the right. Collapsed by default once
 * done; the expanded body shows the resolved input params and any
 * non-tabular results. Tabular results render as a full-width table
 * below the card, outside the collapse.
 */
function StepCard({ item }: { item: TranscriptItem }) {
  const [expanded, setExpanded] = useState(false)
  const results = item.results ?? []
  const rows = results.flatMap((r) => extractRows(r)) as Row[]
  const nonTabular = results.filter((r) => extractRows(r).length === 0)
  const running = item.status === 'running'
  const failed = item.status === 'error'

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-heading font-semibold text-sm">{skillTitle(item.skillId)}</span>
            <span className="block text-xs text-muted-foreground truncate">
              {running
                ? item.progress?.message ?? 'Running…'
                : failed
                  ? 'Failed'
                  : 'Completed'}
            </span>
          </span>
          <Badge
            className={
              failed
                ? 'bg-confidence-low text-white border-transparent'
                : running
                  ? 'bg-confidence-medium text-white border-transparent'
                  : 'bg-confidence-high text-white border-transparent'
            }
          >
            {failed ? 'FAILED' : running ? 'RUNNING' : '✓ DONE'}
          </Badge>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {expanded && (
          <div className="border-t border-border px-4 py-3 space-y-3">
            {item.input && Object.keys(item.input).length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Input</p>
                <StructuredValue value={item.input} />
              </div>
            )}
            {item.errorMessage && <p className="text-sm text-destructive">{item.errorMessage}</p>}
            {nonTabular.map((r, i) => (
              <div key={i} className="rounded-md border border-border bg-background/40 p-3">
                <StructuredValue value={r} />
              </div>
            ))}
          </div>
        )}
      </div>
      {!expanded && item.errorMessage && (
        <p className="text-sm text-destructive px-1">{item.errorMessage}</p>
      )}
      {rows.length > 0 && <ResultTable rows={rows} filename={item.skillId ?? 'results'} />}
    </div>
  )
}
