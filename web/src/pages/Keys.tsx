/**
 * /keys — provider connection dashboard (settings surface).
 *
 * Mirrors ColdIQ's "Connect your tools" layout with left sidebar navigation
 * and organized provider sections.
 */

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Zap, Database, X } from 'lucide-react'
import { api } from '@/lib/api'
import { describeError } from '@/lib/feedback'
import { cn } from '@/lib/utils'

interface KeyEntry {
  id: string
  name: string
  description: string
  type: 'builtin' | 'mcp' | 'mock'
  capabilities: string[]
  status: 'green' | 'red' | 'gray'
  hasHealthProbe: boolean
  category?: string
}

interface ListResponse {
  providers: KeyEntry[]
}

const SETTINGS_NAV = [
  { label: 'API keys', href: '#api-keys' },
  { label: 'Usage', href: '#usage' },
  { label: 'Connect your tools', href: '#' },
  { label: 'Preferences', href: '#preferences' },
  { label: 'Billing', href: '#billing' },
]

function statusBadge(status: KeyEntry['status']): { label: string; variant: string } {
  if (status === 'green') return { label: 'Connected', variant: 'bg-confidence-high text-white' }
  if (status === 'red') return { label: 'Error', variant: 'bg-confidence-low text-white' }
  return { label: 'Not connected', variant: 'bg-muted text-muted-foreground' }
}

function ProviderCard({
  provider,
  onConnect,
}: {
  provider: KeyEntry
  onConnect: (providerId: string) => void
}) {
  const badge = statusBadge(provider.status)
  const Icon = provider.id.includes('data') ? Database : Zap

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-4 hover:bg-background/50 transition-colors">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
        <Icon size={20} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="font-semibold text-sm">{provider.name}</h3>
          <Badge className={`${badge.variant} border-transparent text-xs`}>
            {badge.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{provider.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={() => onConnect(provider.id)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          CONNECT
        </Button>
      </div>
    </div>
  )
}

function ApiKeyModal({
  providerId,
  providerName,
  onClose,
}: {
  providerId: string
  providerName: string
  onClose: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Map provider IDs to their env var names (from configs/providers/*.yaml)
      const envVarMap: Record<string, string> = {
        crustdata: 'CRUSTDATA_API_KEY',
        instantly: 'INSTANTLY_API_KEY',
        unipile: 'UNIPILE_DSN',
        apollo: 'APOLLO_API_KEY',
        'people-data-labs': 'PDL_API_KEY',
        zoominfo: 'ZOOMINFO_API_KEY',
        brevo: 'BREVO_API_KEY',
        pappers: 'PAPPERS_API_KEY',
        hubspot: 'HUBSPOT_ACCESS_TOKEN',
        salesforce: 'SALESFORCE_ACCESS_TOKEN',
        apify: 'APIFY_API_KEY',
        firecrawl: 'FIRECRAWL_API_KEY',
        fullenrich: 'FULLENRICH_API_KEY',
        linkup: 'LINKUP_API_KEY',
        orthogonal: 'ORTHOGONAL_API_KEY',
        prospeo: 'PROSPEO_API_KEY',
      }

      const envVar = envVarMap[providerId.toLowerCase()] || `${providerId.toUpperCase()}_API_KEY`

      await api.post('/api/keys/save', {
        provider: providerId,
        env: { [envVar]: apiKey },
      })
      // Wait a moment for the provider to initialize, then close
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err) {
      setError(describeError(err, 'Failed to save API key'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-base">{providerName}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-background transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {providerName === 'Unipile' ? 'DSN (Data Source Name)' : 'API Key'}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Keys() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalProvider, setModalProvider] = useState<{ id: string; name: string } | null>(null)

  const reload = useCallback(async () => {
    setLoadError(null)
    try {
      setData(await api.get<ListResponse>('/api/keys/list'))
    } catch (err) {
      setLoadError(describeError(err, 'Failed to load providers'))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const providers = data?.providers ?? []

  // Filter out internal/mock providers that don't need API keys
  const configurable = providers.filter(p => !['qualify', 'research', 'mock'].includes(p.id))

  const yourTools = configurable.filter(
    (p) =>
      ['instantly', 'lemlist', 'unipile', 'attio'].some((id) =>
        p.id.toLowerCase().includes(id),
      ),
  )
  const dataProviders = configurable.filter(
    (p) =>
      ['crustdata', 'firecrawl', 'clay', 'apollo'].some((id) =>
        p.id.toLowerCase().includes(id),
      ) || p.id.includes('data'),
  )
  const other = configurable.filter(
    (p) => !yourTools.includes(p) && !dataProviders.includes(p),
  )

  const filtered = (list: KeyEntry[]) =>
    list.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()),
    )

  return (
    <div className="min-h-screen flex">
      {/* Settings Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card px-5 py-6 sticky top-0 h-screen overflow-y-auto">
        <h2 className="font-heading text-sm font-semibold mb-4">Settings</h2>
        <nav className="space-y-1">
          {SETTINGS_NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                item.label === 'Connect your tools'
                  ? 'bg-background font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Connect your tools</h1>
            <p className="text-sm text-muted-foreground">
              Bring your own keys so playground requests run against your own provider accounts.
            </p>
          </div>

          {loadError && (
            <p className="rounded-lg border border-border bg-destructive/10 p-3 text-sm text-destructive">
              {loadError}
            </p>
          )}

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search providers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          {/* Your tools section */}
          {filtered(yourTools).length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-base font-semibold">Your tools</h2>
              <p className="text-xs text-muted-foreground mb-3">
                These tools always run on your own account — connect them once instead of passing a key on every request.
              </p>
              <div className="space-y-2">
                {filtered(yourTools).map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onConnect={(id) => setModalProvider({ id, name: p.name })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Data providers section */}
          {filtered(dataProviders).length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-base font-semibold">
                Data providers — use your own key
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                These providers normally run on our accounts and bill our credits. Store your own API key and requests to that provider use your account instead.
              </p>
              <div className="space-y-2">
                {filtered(dataProviders).map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onConnect={(id) => setModalProvider({ id, name: p.name })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Other providers */}
          {filtered(other).length > 0 && (
            <section className="space-y-3">
              <h2 className="font-heading text-base font-semibold">Other providers</h2>
              <div className="space-y-2">
                {filtered(other).map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onConnect={(id) => setModalProvider({ id, name: p.name })}
                  />
                ))}
              </div>
            </section>
          )}

          {configurable.length > 0 && filtered([...yourTools, ...dataProviders, ...other]).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No providers match "{search}"
            </p>
          )}

          {configurable.length === 0 && !loadError && (
            <p className="text-center text-sm text-muted-foreground py-8">
              No providers configured yet.
            </p>
          )}
        </div>
      </main>

      {/* API Key Modal */}
      {modalProvider && (
        <ApiKeyModal
          providerId={modalProvider.id}
          providerName={modalProvider.name}
          onClose={() => {
            setModalProvider(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
