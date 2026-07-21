import { useState } from 'react'
import { Brain, Plus, X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContextSource {
  id: string
  name: string
  type: 'document' | 'url' | 'folder'
  content?: string
  color: string
}

export function SecondBrain() {
  const [sources, setSources] = useState<ContextSource[]>([
    {
      id: '1',
      name: 'ICP Definition',
      type: 'document',
      content: 'Target: B2B SaaS, $2-50M ARR, 20-500 employees...',
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      id: '2',
      name: 'Playbooks',
      type: 'folder',
      content: 'Cold email, LinkedIn, Demo scripts...',
      color: 'bg-purple-500/10 text-purple-600',
    },
  ])
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')

  const addSource = () => {
    if (newSourceName.trim()) {
      setSources([
        ...sources,
        {
          id: String(Date.now()),
          name: newSourceName,
          type: 'document',
          color: 'bg-orange-500/10 text-orange-600',
        },
      ])
      setNewSourceName('')
      setShowAddSource(false)
    }
  }

  const removeSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id))
  }

  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Second Brain</span>
        </div>
        <button
          onClick={() => setShowAddSource(!showAddSource)}
          className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
          title="Add context source"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Add Source Input */}
      {showAddSource && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            placeholder="Add knowledge source..."
            className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addSource()
              if (e.key === 'Escape') setShowAddSource(false)
            }}
            autoFocus
          />
          <button
            onClick={addSource}
            className="rounded-md bg-orange-500 hover:bg-orange-600 text-white px-2 py-1.5 text-xs font-medium transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Context Sources */}
      <div className="space-y-2">
        {sources.map((source) => (
          <button
            key={source.id}
            className={cn(
              'w-full text-left rounded-md px-3 py-2.5 text-xs transition-colors border border-transparent hover:border-border',
              source.color,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <FileText size={12} className="shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{source.name}</p>
                  {source.content && <p className="text-muted-foreground truncate text-xs mt-0.5 opacity-75">{source.content}</p>}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeSource(source.id)
                }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </button>
        ))}
      </div>

      {sources.length === 0 && !showAddSource && (
        <p className="px-3 py-2 text-xs text-muted-foreground italic">No context sources added yet</p>
      )}

      {/* Info */}
      <p className="px-3 py-2 text-xs text-muted-foreground mt-3 border-t border-border pt-3">
        💡 Add documents, ICPs, or playbooks to give Claude more context for smarter responses
      </p>
    </div>
  )
}
