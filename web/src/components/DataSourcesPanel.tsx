import { useState, useEffect } from 'react'
import { Database, FolderOpen, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Adapter {
  id: string
  available: boolean
}

interface SyncResult {
  added: number
  updated: number
  removed: number
  unchanged: number
}

interface DataSource {
  id: string
  label: string
  icon: 'database' | 'folder'
  description: string
  available: boolean
  lastSync: string | undefined
  syncResult?: SyncResult
  syncing?: boolean
}

const ADAPTER_METADATA: Record<string, { label: string; icon: 'database' | 'folder'; description: string; color: string }> = {
  'markdown-folder': {
    label: 'Markdown Folder',
    icon: 'folder',
    description: 'Local knowledge base',
    color: 'bg-blue-500/10 text-blue-600',
  },
  'notion-workspace': {
    label: 'Notion',
    icon: 'database',
    description: 'Notion workspace databases',
    color: 'bg-purple-500/10 text-purple-600',
  },
  'google-drive': {
    label: 'Google Drive',
    icon: 'folder',
    description: 'Google Drive folders & docs',
    color: 'bg-green-500/10 text-green-600',
  },
  'campaign-learner': {
    label: 'Campaign Learner',
    icon: 'database',
    description: 'Internal campaign analysis',
    color: 'bg-orange-500/10 text-orange-600',
  },
}

interface DataSourcesPanelProps {
  onSyncStart?: () => void
  onSyncEnd?: () => void
}

export function DataSourcesPanel({ onSyncStart, onSyncEnd }: DataSourcesPanelProps) {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const [lastSyncTime, setLastSyncTime] = useState<Record<string, string | null>>({})

  useEffect(() => {
    loadAdapters()
  }, [])

  const loadAdapters = async () => {
    try {
      setLoading(true)
      const response = await api.get<{ adapters: Adapter[] }>('/api/brain/adapters')
      const dataSources = response.adapters.map((adapter) => {
        const meta = ADAPTER_METADATA[adapter.id] || {
          label: adapter.id,
          icon: 'database' as const,
          description: 'Data source',
          color: 'bg-gray-500/10 text-gray-600',
        }
        return {
          id: adapter.id,
          ...meta,
          available: adapter.available,
          lastSync: lastSyncTime[adapter.id] || undefined,
        }
      })
      setSources(dataSources)
    } catch (err) {
      console.error('Failed to load adapters:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (adapterId?: string) => {
    try {
      onSyncStart?.()
      const url = adapterId ? `/api/brain/sync/${adapterId}` : '/api/brain/sync'

      if (adapterId) {
        setSyncing((p) => ({ ...p, [adapterId]: true }))
      } else {
        setSyncing(Object.fromEntries(sources.map((s) => [s.id, true])))
      }

      const response = await api.post<{
        ok: boolean
        result?: SyncResult
        results?: Record<string, SyncResult>
      }>(url, {})

      if (adapterId && response.result) {
        setSources((prev) =>
          prev.map((s) =>
            s.id === adapterId
              ? {
                  ...s,
                  syncResult: response.result,
                  lastSync: new Date().toLocaleTimeString(),
                }
              : s,
          ),
        )
      } else if (response.results) {
        const now = new Date().toLocaleTimeString()
        setSources((prev) =>
          prev.map((s) => {
            const result = response.results![s.id]
            return result ? { ...s, syncResult: result, lastSync: now } : s
          }),
        )
        setLastSyncTime(Object.fromEntries(sources.map((s) => [s.id, now])))
      }
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing((p) => (adapterId ? { ...p, [adapterId]: false } : Object.fromEntries(sources.map((s) => [s.id, false]))))
      onSyncEnd?.()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading adapters...</p>
        </CardContent>
      </Card>
    )
  }

  const available = sources.filter((s) => s.available)
  const unavailable = sources.filter((s) => !s.available)

  return (
    <div className="space-y-4">
      {/* Connected Sources */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-green-600" />
                Connected Sources
              </CardTitle>
              <CardDescription>{available.length} source(s) connected</CardDescription>
            </div>
            {available.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync()}
                disabled={Object.values(syncing).some((v) => v)}
              >
                <RefreshCw size={16} className={cn('mr-2', Object.values(syncing).some((v) => v) && 'animate-spin')} />
                {Object.values(syncing).some((v) => v) ? 'Syncing…' : 'Sync All'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No data sources connected yet</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {available.map((source) => (
                <div
                  key={source.id}
                  className={cn(
                    'rounded-lg border border-border p-4',
                    'hover:border-orange-300 transition-colors',
                    ADAPTER_METADATA[source.id]?.color || 'bg-gray-50',
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1">
                      {source.icon === 'database' ? (
                        <Database size={18} className="shrink-0 mt-0.5" />
                      ) : (
                        <FolderOpen size={18} className="shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm">{source.label}</h4>
                        <p className="text-xs text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                  </div>

                  {source.syncResult && (
                    <div className="text-xs space-y-1 mb-3 pl-6">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Added:</span>
                        <span className="font-mono font-semibold text-foreground">{source.syncResult.added}</span>
                      </div>
                      {source.syncResult.unchanged > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Unchanged:</span>
                          <span className="font-mono">{source.syncResult.unchanged}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pl-6">
                    {source.lastSync && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {source.lastSync}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSync(source.id)}
                      disabled={syncing[source.id]}
                      className="h-7 px-2"
                    >
                      <RefreshCw
                        size={14}
                        className={cn('mr-1', syncing[source.id] && 'animate-spin')}
                      />
                      {syncing[source.id] ? 'Syncing' : 'Sync'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unavailable Sources */}
      {unavailable.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600" />
                Available to Connect
              </CardTitle>
              <CardDescription>{unavailable.length} source(s) can be connected</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unavailable.map((source) => (
                <div key={source.id} className="rounded-lg border border-dashed border-border p-3 opacity-60">
                  <div className="flex items-start gap-2">
                    {source.icon === 'database' ? (
                      <Database size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
                    ) : (
                      <FolderOpen size={16} className="shrink-0 mt-0.5 text-muted-foreground" />
                    )}
                    <div>
                      <h4 className="font-semibold text-sm">{source.label}</h4>
                      <p className="text-xs text-muted-foreground">{source.description}</p>
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠ Missing credentials. Check .env for {source.id === 'notion-workspace' ? 'NOTION_API_KEY' : 'config'}.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            💡 Data sources sync automatically on schedule and feed into your Brain context. All synced data is indexed
            for semantic search.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
