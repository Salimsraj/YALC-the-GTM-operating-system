import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Database, FileText, Trash2, Save, Folder, Trash } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExtractedNode } from '@/hooks/useBrainState'

interface DataSource {
  id: string
  type: 'notion' | 'google-drive' | 'hubspot' | 'salesforce' | 'fireflies' | 'obsidian' | 'website' | 'manual'
  name: string
  status: 'connected' | 'syncing' | 'synced' | 'error'
  itemsExtracted?: number
  lastSync?: string
  config?: Record<string, unknown>
}

interface GraphNode {
  id: string
  type: 'company' | 'person' | 'deal' | 'objection' | 'value_prop' | 'note' | 'meeting'
  name: string
  content?: string
  source?: string
  metadata?: Record<string, unknown>
}

interface SecondBrainBuilderProps {
  onNodesExtracted?: (nodes: ExtractedNode[]) => Promise<void>
  onClear?: () => void
}

const SOURCE_CONFIG = {
  notion: {
    icon: Database,
    label: 'Notion',
    color: 'bg-purple-500/10 text-purple-600',
    instructions: 'Enter your Notion workspace ID and API token',
  },
  'google-drive': {
    icon: FileText,
    label: 'Google Drive',
    color: 'bg-green-500/10 text-green-600',
    instructions: 'Authorize Google Drive access',
  },
  obsidian: {
    icon: Folder,
    label: 'Obsidian Vault',
    color: 'bg-indigo-500/10 text-indigo-600',
    instructions: 'Select your Obsidian vault folder',
  },
  hubspot: {
    icon: Database,
    label: 'HubSpot',
    color: 'bg-orange-500/10 text-orange-600',
    instructions: 'Enter your HubSpot API key',
  },
  salesforce: {
    icon: Database,
    label: 'Salesforce',
    color: 'bg-blue-500/10 text-blue-600',
    instructions: 'Enter Salesforce org URL and API credentials',
  },
  fireflies: {
    icon: FileText,
    label: 'Fireflies.ai',
    color: 'bg-pink-500/10 text-pink-600',
    instructions: 'Enter Fireflies API token',
  },
  website: {
    icon: FileText,
    label: 'Website',
    color: 'bg-blue-500/10 text-blue-600',
    instructions: 'Enter your website URL',
  },
  manual: {
    icon: Plus,
    label: 'Add Manually',
    color: 'bg-gray-500/10 text-gray-600',
    instructions: 'Type or paste information directly',
  },
}

export function SecondBrainBuilder({ onNodesExtracted, onClear }: SecondBrainBuilderProps = {}) {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [showAddSource, setShowAddSource] = useState(false)
  const [selectedSourceType, setSelectedSourceType] = useState<keyof typeof SOURCE_CONFIG | null>(null)
  const [sourceConfig, setSourceConfig] = useState<Record<string, string>>({})
  const [manualInput, setManualInput] = useState('')
  const [selectedNodeType, setSelectedNodeType] = useState<GraphNode['type']>('note')

  const handleAddSource = async (type: keyof typeof SOURCE_CONFIG) => {
    setSelectedSourceType(type)
  }

  const handleConnectSource = async () => {
    if (!selectedSourceType || !sourceConfig.name) return

    const newSource: DataSource = {
      id: `${selectedSourceType}-${Date.now()}`,
      type: selectedSourceType as any,
      name: sourceConfig.name,
      status: 'syncing',
      lastSync: new Date().toISOString(),
    }

    setDataSources([...dataSources, newSource])

    try {
      // Call extraction API
      let response
      const endpoint = `/api/brain/extract/${selectedSourceType}`

      switch (selectedSourceType) {
        case 'notion':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: sourceConfig.apiKey,
              databaseId: sourceConfig.databaseId,
            }),
          })
          break
        case 'hubspot':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: sourceConfig.apiKey }),
          })
          break
        case 'salesforce':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgUrl: sourceConfig.orgUrl,
              clientId: sourceConfig.clientId,
            }),
          })
          break
        case 'fireflies':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: sourceConfig.apiKey }),
          })
          break
        case 'google-drive':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
          break
        case 'website':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: sourceConfig.url }),
          })
          break
        case 'obsidian':
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vaultPath: sourceConfig.vaultPath }),
          })
          break
        default:
          throw new Error(`Unknown source type: ${selectedSourceType}`)
      }

      if (!response.ok) {
        throw new Error(`Extraction failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Update source with extracted items
      setDataSources((prev) =>
        prev.map((s) =>
          s.id === newSource.id
            ? {
                ...s,
                status: 'synced',
                itemsExtracted: result.itemsExtracted || 0,
              }
            : s,
        ),
      )

      // Add extracted nodes to graph and brain
      if (result.nodes && Array.isArray(result.nodes)) {
        const newNodes = result.nodes.map((node: any) => ({
          id: `${result.source}-${node.name}-${Date.now()}`,
          type: node.type,
          name: node.name,
          content: node.content,
          source: result.source,
          metadata: node.metadata,
        }))
        setNodes((prev) => [...prev, ...newNodes])

        // Feed extracted nodes to brain for merge
        if (onNodesExtracted) {
          const extractedNodes: ExtractedNode[] = result.nodes.map((node: any) => ({
            type: node.type,
            name: node.name,
            content: node.content,
            metadata: {
              ...node.metadata,
              source: result.source,
            },
            relationships: node.relationships,
          }))
          await onNodesExtracted(extractedNodes)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Extraction error:', error)
      setDataSources((prev) =>
        prev.map((s) =>
          s.id === newSource.id
            ? {
                ...s,
                status: 'error',
                config: { ...s.config, errorMessage: errorMsg },
              }
            : s,
        ),
      )
    }

    setSelectedSourceType(null)
    setSourceConfig({})
  }

  const handleAddManualNode = async () => {
    if (!manualInput.trim()) return

    // If it's a longer text input, use Claude to extract entities
    if (manualInput.length > 100 && selectedNodeType === 'note') {
      try {
        const response = await fetch('/api/brain/extract/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: manualInput,
            context: 'User manually entered this information into Second Brain',
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.nodes && Array.isArray(result.nodes)) {
            const newNodes = result.nodes.map((node: any) => ({
              id: `manual-extract-${node.name}-${Date.now()}`,
              type: node.type,
              name: node.name,
              content: node.content,
              source: 'manual-extract',
              metadata: node.metadata,
            }))
            setNodes((prev) => [...prev, ...newNodes])
            setManualInput('')
            return
          }
        }
      } catch (error) {
        console.error('Extraction error:', error)
        // Fall through to manual entry
      }
    }

    // Default: add as single node
    const newNode: GraphNode = {
      id: `manual-${Date.now()}`,
      type: selectedNodeType,
      name: manualInput,
      source: 'manual',
      content: manualInput,
      metadata: {
        addedAt: new Date().toISOString(),
      },
    }

    setNodes([...nodes, newNode])
    setManualInput('')
  }

  const removeSource = (id: string) => {
    setDataSources(dataSources.filter((s) => s.id !== id))
  }

  const removeNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id))
  }

  const handleClearBrain = () => {
    if (confirm('Clear all brain data? This cannot be undone.')) {
      setDataSources([])
      setNodes([])
      if (onClear) {
        onClear()
      }
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Data Sources Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Sources</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your data sources to extract information into Second Brain
              </p>
            </div>
            <Button onClick={() => setShowAddSource(!showAddSource)} className="gap-2">
              <Plus size={16} />
              Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Source Grid */}
          {showAddSource && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {Object.entries(SOURCE_CONFIG).map(([type, config]) => {
                const Icon = config.icon
                return (
                  <button
                    key={type}
                    onClick={() => handleAddSource(type as keyof typeof SOURCE_CONFIG)}
                    className={cn(
                      'rounded-lg border-2 border-dashed p-4 transition-colors text-center',
                      selectedSourceType === type
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-border hover:border-orange-300',
                    )}
                  >
                    <Icon size={24} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">{config.label}</p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Source Config Form */}
          {selectedSourceType && (
            <div className="rounded-lg border border-border p-4 bg-muted/50">
              <div className="space-y-3">
                <p className="text-sm font-medium">{SOURCE_CONFIG[selectedSourceType].instructions}</p>
                {selectedSourceType !== 'google-drive' && (
                  <>
                    <input
                      type="text"
                      placeholder="Source name (e.g., 'My Website' or 'Outbound OS')"
                      value={sourceConfig.name || ''}
                      onChange={(e) => setSourceConfig({ ...sourceConfig, name: e.target.value })}
                      className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    {selectedSourceType === 'notion' && (
                      <>
                        <input
                          type="text"
                          placeholder="Notion API Token"
                          value={sourceConfig.apiKey || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, apiKey: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="text"
                          placeholder="Database ID"
                          value={sourceConfig.databaseId || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, databaseId: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </>
                    )}
                    {selectedSourceType === 'hubspot' && (
                      <input
                        type="text"
                        placeholder="HubSpot API Key"
                        value={sourceConfig.apiKey || ''}
                        onChange={(e) => setSourceConfig({ ...sourceConfig, apiKey: e.target.value })}
                        className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    )}
                    {selectedSourceType === 'salesforce' && (
                      <>
                        <input
                          type="text"
                          placeholder="Salesforce Org URL"
                          value={sourceConfig.orgUrl || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, orgUrl: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="text"
                          placeholder="Client ID"
                          value={sourceConfig.clientId || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, clientId: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </>
                    )}
                    {selectedSourceType === 'website' && (
                      <>
                        <input
                          type="url"
                          placeholder="Website URL (e.g., https://example.com)"
                          value={sourceConfig.url || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, url: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        {!sourceConfig.url && sourceConfig.name && (
                          <p className="text-xs text-orange-600">Enter a website URL above</p>
                        )}
                      </>
                    )}
                    {selectedSourceType === 'obsidian' && (
                      <>
                        <input
                          type="text"
                          placeholder="Source name (e.g., 'My Obsidian Vault')"
                          value={sourceConfig.name || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, name: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="text"
                          placeholder="Vault path (e.g., /Users/yourname/Documents/MyVault or leave empty to use default)"
                          value={sourceConfig.vaultPath || ''}
                          onChange={(e) => setSourceConfig({ ...sourceConfig, vaultPath: e.target.value })}
                          className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </>
                    )}
                  </>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleConnectSource}
                    disabled={!sourceConfig.name || (selectedSourceType === 'website' && !sourceConfig.url)}
                    className="flex-1"
                  >
                    Connect & Extract
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSourceType(null)
                      setSourceConfig({})
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Connected Sources List */}
          {dataSources.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Connected Sources ({dataSources.length})</p>
              {dataSources.map((source) => {
                const config = SOURCE_CONFIG[source.type]
                return (
                  <div key={source.id} className={cn('rounded-lg p-3 border border-border', config.color)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Database size={18} />
                        <div>
                          <p className="font-medium text-sm">{source.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {source.status === 'syncing' && 'Extracting...'}
                            {source.status === 'synced' && `${source.itemsExtracted} items extracted`}
                            {source.status === 'error' && (
                              <span className="text-red-600">
                                {(source.config as any)?.errorMessage || 'Connection failed'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{source.status}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSource(source.id)}
                        disabled={source.status === 'syncing'}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Manually</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Add notes, companies, objections, or any information directly</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={selectedNodeType}
                onChange={(e) => setSelectedNodeType(e.target.value as GraphNode['type'])}
                className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mt-1"
              >
                <option value="note">Note</option>
                <option value="company">Company</option>
                <option value="person">Person</option>
                <option value="deal">Deal</option>
                <option value="objection">Objection</option>
                <option value="value_prop">Value Prop</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Content</label>
              <textarea
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste or type information here..."
                className="w-full rounded px-3 py-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mt-1 min-h-32"
              />
            </div>

            <Button onClick={handleAddManualNode} disabled={!manualInput.trim()} className="w-full gap-2">
              <Save size={16} />
              Add to Second Brain
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Data Section */}
      {nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Information ({nodes.length})</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">All data from connectors and manual entry</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nodes.map((node) => (
                <div key={node.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Badge className="mb-2">{node.type.replace(/_/g, ' ').toUpperCase()}</Badge>
                    <p className="font-medium text-sm break-words">{node.name}</p>
                    {node.content && node.content !== node.name && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.content}</p>
                    )}
                    {node.source && <p className="text-xs text-muted-foreground mt-1">from {node.source}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNode(node.id)}
                    className="shrink-0"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-orange-600">{dataSources.length}</p>
            <p className="text-xs text-muted-foreground">Data Sources Connected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-blue-600">
              {dataSources.reduce((sum, s) => sum + (s.itemsExtracted || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Items Extracted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{nodes.length}</p>
            <p className="text-xs text-muted-foreground">Nodes in Graph</p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Brain Button */}
      {(dataSources.length > 0 || nodes.length > 0) && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleClearBrain} className="gap-2 text-destructive hover:text-destructive">
            <Trash size={16} />
            Clear Brain
          </Button>
        </div>
      )}
    </div>
  )
}
