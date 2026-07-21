import { useState } from 'react'
import { Plus, Trash2, Link2, Globe, Database, FolderOpen, Settings, CheckCircle2, AlertCircle, Loader } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DataSource {
  id: string
  type: 'website' | 'notion' | 'google-drive' | 'crm'
  name: string
  url?: string
  status: 'connected' | 'analyzing' | 'synced' | 'error'
  lastSync?: string
  itemsIngested: number
  relationships: number
}

export function SecondBrainManager() {
  const [sources, setSources] = useState<DataSource[]>([
    {
      id: '1',
      type: 'website',
      name: 'Company Website',
      url: 'example.com',
      status: 'synced',
      lastSync: '2 hours ago',
      itemsIngested: 45,
      relationships: 12,
    },
  ])

  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceType, setNewSourceType] = useState<'website' | 'notion' | 'google-drive' | 'crm' | null>(null)
  const [inputValue, setInputValue] = useState('')

  const sourceTypeConfig = {
    website: { icon: Globe, label: 'Website', color: 'bg-blue-500/10 text-blue-600', placeholder: 'https://example.com' },
    notion: { icon: Database, label: 'Notion Database', color: 'bg-purple-500/10 text-purple-600', placeholder: 'Database ID' },
    'google-drive': { icon: FolderOpen, label: 'Google Drive', color: 'bg-green-500/10 text-green-600', placeholder: 'Folder ID' },
    crm: { icon: Settings, label: 'CRM (Salesforce/HubSpot)', color: 'bg-orange-500/10 text-orange-600', placeholder: 'API Key' },
  }

  const addSource = () => {
    if (!newSourceType || !inputValue.trim()) return

    const newSource: DataSource = {
      id: Date.now().toString(),
      type: newSourceType,
      name: sourceTypeConfig[newSourceType].label,
      url: inputValue,
      status: 'analyzing',
      itemsIngested: 0,
      relationships: 0,
    }

    setSources([...sources, newSource])
    setInputValue('')
    setNewSourceType(null)
    setShowAddSource(false)

    // Simulate analysis
    setTimeout(() => {
      setSources((prev) =>
        prev.map((s) =>
          s.id === newSource.id
            ? {
                ...s,
                status: 'synced',
                lastSync: 'just now',
                itemsIngested: Math.floor(Math.random() * 50) + 20,
                relationships: Math.floor(Math.random() * 15) + 5,
              }
            : s,
        ),
      )
    }, 3000)
  }

  const removeSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id))
  }

  const statusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 size={16} className="text-green-600" />
      case 'analyzing':
        return <Loader size={16} className="text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle size={16} className="text-red-600" />
      default:
        return <AlertCircle size={16} className="text-yellow-600" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 size={20} className="text-orange-500" />
                Second Brain — Data Sources
              </CardTitle>
              <CardDescription>
                Connect websites, Notion, Google Drive, and CRMs. Everything gets analyzed and interconnected.
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddSource(!showAddSource)} className="gap-2">
              <Plus size={16} />
              Add Source
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Add Source Form */}
      {showAddSource && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Type Selection */}
              {!newSourceType ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(sourceTypeConfig).map(([type, config]) => {
                    const Icon = config.icon
                    return (
                      <button
                        key={type}
                        onClick={() => setNewSourceType(type as DataSource['type'])}
                        className={cn(
                          'rounded-lg border-2 border-dashed border-border p-4 text-center transition-colors',
                          'hover:border-orange-300 hover:bg-orange-50',
                        )}
                      >
                        <Icon size={24} className="mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs font-semibold">{config.label}</p>
                      </button>
                    )
                  })}
                </div>
              ) : (
                /* Input */
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {sourceTypeConfig[newSourceType].label}
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={sourceTypeConfig[newSourceType].placeholder}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSource()
                      if (e.key === 'Escape') {
                        setNewSourceType(null)
                        setInputValue('')
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={addSource} disabled={!inputValue.trim()} className="flex-1">
                      Connect & Analyze
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewSourceType(null)
                        setInputValue('')
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Sources Grid */}
      <div className="grid gap-3">
        {sources.length === 0 && !showAddSource ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                No data sources connected yet. Add your first source to build your Second Brain.
              </p>
            </CardContent>
          </Card>
        ) : (
          sources.map((source) => {
            const config = sourceTypeConfig[source.type]
            const Icon = config.icon
            return (
              <Card key={source.id} className={cn('hover:border-orange-300 transition-colors', config.color)}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon size={20} className="shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{source.name}</h4>
                          <div className="flex items-center gap-1">
                            {statusIcon(source.status)}
                            <Badge variant="outline" className="text-xs capitalize">
                              {source.status}
                            </Badge>
                          </div>
                        </div>

                        {source.url && <p className="text-xs text-muted-foreground mt-1 truncate">{source.url}</p>}

                        {source.lastSync && (
                          <p className="text-xs text-muted-foreground mt-2">Last synced: {source.lastSync}</p>
                        )}

                        {/* Stats */}
                        <div className="flex gap-4 mt-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Items Ingested</p>
                            <p className="text-sm font-semibold">{source.itemsIngested}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Relationships</p>
                            <p className="text-sm font-semibold">{source.relationships}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSource(source.id)}
                        disabled={source.status === 'analyzing'}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Info */}
      {sources.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>How it works:</strong>
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Website: Extract company info, team, products, tech stack, use cases</li>
                <li>Notion: Pull structured company data, deals, notes</li>
                <li>Google Drive: Index documents, research, case studies</li>
                <li>CRM: Sync customers, deal stages, communications</li>
                <li>Everything is interconnected and searchable via semantic retrieval</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
