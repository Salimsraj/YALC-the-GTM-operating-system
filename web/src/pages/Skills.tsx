/**
 * /skills — skill catalog browser + ad-hoc runner.
 *
 * URL shape:
 *   /skills            → list with category tabs
 *   /skills/<id>       → detail panel with input form + run output
 *
 * Mirrors the popstate-listener pattern App.tsx uses — when the user
 * clicks a skill we update history.pushState and re-render based on the
 * pathname.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { describeError, eyebrowClass, preBlockClass } from '@/lib/feedback'
import { SkillInputForm } from '@/components/skills/SkillInputForm'
import {
  coerceFormValues,
  hasUnsupportedSchema,
  loadPersistedInputs,
  savePersistedInputs,
  validateFormData,
  type RawFormValues,
  type SkillInputSchema,
} from '@/lib/skills-form'

interface SkillSummary {
  id: string
  name: string
  version: string
  description: string
  category: string
}

interface SkillDetail extends SkillSummary {
  inputSchema: SkillInputSchema
  outputSchema: Record<string, unknown>
  bodyPreview: string | null
}

interface ListResponse {
  skills: SkillSummary[]
  total: number
}

interface RunResponse {
  ok: boolean
  output?: unknown
  progress?: Array<{ message: string; percent: number }>
  error?: string
  message?: string
}

const CATEGORIES = [
  'research',
  'content',
  'outreach',
  'analysis',
  'qualification',
  'integration',
  'custom',
] as const
type Category = (typeof CATEGORIES)[number]
const labelOf = (c: string) => c.charAt(0).toUpperCase() + c.slice(1)

function pushPath(path: string) {
  if (typeof window === 'undefined') return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function detailIdFromPath(pathname: string): string | null {
  // /skills/<id> — keep raw to handle md:<name>.
  const m = pathname.match(/^\/skills\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function Skills() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window === 'undefined' ? '/skills' : window.location.pathname,
  )
  const [list, setList] = useState<SkillSummary[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<'all' | Category>('all')

  // Listen for popstate so back/forward + internal nav work.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const reloadList = useCallback(async () => {
    setListError(null)
    try {
      const res = await api.get<ListResponse>('/api/skills/list')
      setList(res.skills)
    } catch (err) {
      setListError(describeError(err, 'Failed to load skills'))
    }
  }, [])

  useEffect(() => {
    reloadList()
  }, [reloadList])

  // Detail fetch when on /skills/<id>.
  const detailId = detailIdFromPath(pathname)
  useEffect(() => {
    if (!detailId) {
      setDetail(null)
      setDetailError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailError(null)
      try {
        const res = await api.get<SkillDetail>(`/api/skills/${encodeURIComponent(detailId)}`)
        if (!cancelled) setDetail(res)
      } catch (err) {
        if (!cancelled) setDetailError(describeError(err, 'Failed to load skill'))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detailId])

  const filtered = useMemo(() => {
    if (!list) return []
    if (activeCategory === 'all') return list
    return list.filter((s) => s.category === activeCategory)
  }, [list, activeCategory])

  if (detailId) {
    return (
      <SkillDetailPage
        id={detailId}
        skill={detail}
        error={detailError}
        onBack={() => pushPath('/skills')}
      />
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skills</p>
          <h2 className="font-heading font-bold text-lg mt-1">Catalog</h2>
        </div>

        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {(['all', ...CATEGORIES] as Array<'all' | Category>).map((c) => (
            <button
              key={c}
              role="tab"
              data-testid={`skills-tab-${c}`}
              aria-selected={activeCategory === c}
              onClick={() => setActiveCategory(c)}
              className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors font-medium ${
                activeCategory === c
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-background'
              }`}
            >
              {c === 'all' ? 'All Skills' : labelOf(c)}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-8">
        <div className="max-w-5xl space-y-8">
          <header>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Skill catalog</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Bundled and user-defined skills available to the runner.
            </p>
          </header>

          {listError && (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">{listError}</CardContent>
            </Card>
          )}

          {list && filtered.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground" data-testid="skills-empty">
                No skills in this category.
              </CardContent>
            </Card>
          )}

          {/* Skills by category section */}
          {filtered.length > 0 && (
            <div className="space-y-6">
              {groupSkillsByCategory(filtered).map(([category, categorySkills]) => (
                <div key={category} className="space-y-3">
                  <div className="px-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {labelOf(category)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {categorySkills.map((s) => (
                      <div
                        key={s.id}
                        data-testid={`skills-card-${s.id}`}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-foreground/20 hover:bg-background/50 transition-colors"
                      >
                        {/* Icon placeholder */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h3 className="font-semibold text-sm text-foreground">{s.name}</h3>
                              <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`skills-open-${s.id}`}
                            onClick={() => pushPath(`/skills/${encodeURIComponent(s.id)}`)}
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function groupSkillsByCategory(skills: SkillSummary[]): Array<[string, SkillSummary[]]> {
  const grouped = new Map<string, SkillSummary[]>()
  skills.forEach((skill) => {
    const cat = skill.category || 'other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(skill)
  })
  return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]))
}

interface DetailProps {
  id: string
  skill: SkillDetail | null
  error: string | null
  onBack: () => void
}

export function SkillDetailPage({ id, skill, error, onBack }: DetailProps) {
  const [inputs, setInputs] = useState<RawFormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [runBusy, setRunBusy] = useState(false)
  const [runResult, setRunResult] = useState<RunResponse | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  // Raw JSON fallback path — auto-engaged when the schema is unsupported,
  // otherwise opt-in via the "Use raw JSON instead" toggle.
  const [forceJson, setForceJson] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  // Hydrate from localStorage as soon as the skill detail lands.
  useEffect(() => {
    if (!skill) return
    const persisted = loadPersistedInputs(skill.id)
    if (Object.keys(persisted).length > 0) {
      setInputs(persisted)
      // If the persisted snapshot was a JSON string blob, surface it too.
      if (typeof persisted.__rawJson === 'string') {
        setJsonText(persisted.__rawJson)
      }
    }
  }, [skill])

  // Persist on every change so refreshes don't blow away work.
  useEffect(() => {
    if (!skill) return
    const snapshot: RawFormValues = { ...inputs }
    if (jsonText) snapshot.__rawJson = jsonText
    savePersistedInputs(skill.id, snapshot)
  }, [inputs, jsonText, skill])

  const schemaUnsupported = hasUnsupportedSchema(skill?.inputSchema)

  const handleRun = async () => {
    if (!skill) return
    setRunError(null)
    setRunResult(null)

    // Decide payload based on which surface is active.
    const useJson = forceJson || schemaUnsupported
    let payload: Record<string, unknown>
    if (useJson) {
      const text = jsonText.trim()
      if (!text) {
        setJsonError('Provide a JSON object or switch to the structured form.')
        return
      }
      try {
        const parsed = JSON.parse(text)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setJsonError('Top-level value must be a JSON object.')
          return
        }
        payload = parsed as Record<string, unknown>
        setJsonError(null)
      } catch (err) {
        setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
        return
      }
    } else {
      const v = validateFormData(skill.inputSchema, inputs)
      setErrors(v)
      if (Object.keys(v).length > 0) return
      payload = coerceFormValues(skill.inputSchema, inputs)
    }

    setRunBusy(true)
    try {
      setRunResult(
        await api.post<RunResponse>(
          `/api/skills/run/${encodeURIComponent(skill.id)}`,
          payload,
        ),
      )
    } catch (err) {
      setRunError(describeError(err, 'Run failed'))
    } finally {
      setRunBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="skills-detail-back" className="w-full">
            ← Back
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-8">
        <div className="max-w-5xl space-y-6">
          {error && (
            <Card>
              <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          )}
          {skill && (
            <>
              <header>
                <p className={eyebrowClass}>{skill.category}</p>
                <h1 className="font-heading text-3xl font-bold tracking-tight">{skill.name}</h1>
                <p className="font-mono text-xs text-muted-foreground mt-1">{skill.id} · v{skill.version}</p>
                <p className="text-sm mt-2">{skill.description}</p>
              </header>

              <Card>
                <CardHeader>
                  <CardTitle>Run with these inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(skill.inputSchema?.properties &&
                    Object.keys(skill.inputSchema.properties).length === 0) && (
                    <p className="text-xs text-muted-foreground">No declared inputs.</p>
                  )}
                  <SkillInputForm
                    skillId={skill.id}
                    schema={skill.inputSchema}
                    values={inputs}
                    errors={errors}
                    onChange={(next) => {
                      setInputs(next)
                      if (Object.keys(errors).length > 0) setErrors({})
                    }}
                    forceJson={forceJson}
                    jsonText={jsonText}
                    onJsonTextChange={(t) => {
                      setJsonText(t)
                      if (jsonError) setJsonError(null)
                    }}
                    jsonError={jsonError}
                    allowJsonToggle={!schemaUnsupported}
                    onToggleJson={() => setForceJson((v) => !v)}
                  />
                  <Button
                    variant="default"
                    size="sm"
                    data-testid="skills-run"
                    disabled={runBusy}
                    onClick={handleRun}
                  >
                    {runBusy ? 'Running…' : 'Run'}
                  </Button>
                  {runError && (
                    <p className="text-xs text-destructive" data-testid="skills-run-error">
                      {runError}
                    </p>
                  )}
                  {runResult && (
                    <pre data-testid="skills-run-result" className={preBlockClass}>
                      {JSON.stringify(runResult, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>

              {skill.bodyPreview && (
                <pre data-testid="skills-body-preview" className={preBlockClass}>
                  {skill.bodyPreview}
                </pre>
              )}
            </>
          )}
          {!skill && !error && <p className="text-sm text-muted-foreground">Loading {id}…</p>}
        </div>
      </main>
    </div>
  )
}
