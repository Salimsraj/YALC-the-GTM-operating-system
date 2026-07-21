import { useState } from 'react'
import { Search, Zap, Sparkles, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  content: string
  sourceType: string
  sourceRef: string
  confidence: string
  confidenceScore: number
  score: number
  reasons: {
    rrf: number
    denseRank: number | null
    keywordRank: number | null
    confidenceBoost: number
    recencyDecay: number
    accessBoost: number
  }
}

interface SearchResponse {
  ok: boolean
  query: string
  results: SearchResult[]
  error?: string
}

export function BrainSearch() {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await api.get<SearchResponse>('/api/brain/search', {
        q: query,
        topK: '10',
      })

      if (response.ok) {
        setResults(response.results)
      } else {
        setError(response.error || 'Search failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const confidenceColor = (conf: string) => {
    switch (conf) {
      case 'proven':
        return 'bg-green-500/10 text-green-700'
      case 'validated':
        return 'bg-blue-500/10 text-blue-700'
      case 'hypothesis':
        return 'bg-yellow-500/10 text-yellow-700'
      default:
        return 'bg-gray-500/10 text-gray-700'
    }
  }

  const sourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'markdown-folder':
        return '📁'
      case 'notion-workspace':
        return '🗂️'
      case 'google-drive':
        return '☁️'
      case 'campaign-learner':
        return '📊'
      default:
        return '📄'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles size={20} className="text-orange-500" />
          Semantic Search
        </CardTitle>
        <CardDescription>Search your Brain across all connected sources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask your Brain anything... e.g., 'Which persona converts best?'"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Search size={16} className="absolute right-3 top-3 text-muted-foreground" />
          </div>
          <Button
            type="submit"
            disabled={searching || !query.trim()}
            className="gap-2"
          >
            <Zap size={16} />
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !searching && (
          <>
            {results.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {query.trim() ? 'No results found. Try a different query.' : 'Enter a query to search.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </p>
                {results.map((result, idx) => (
                  <div
                    key={result.id}
                    className="rounded-lg border border-border p-4 space-y-2 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-lg">{sourceIcon(result.sourceType)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              #{idx + 1}
                            </Badge>
                            <Badge className={cn('text-xs', confidenceColor(result.confidence))}>
                              {result.confidence}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Score: {(result.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.sourceType} • {result.sourceRef}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    <p className="text-sm line-clamp-3 text-foreground">
                      {result.content}
                    </p>

                    {/* Ranking Reasons */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {result.reasons.denseRank !== null && (
                        <div className="rounded bg-blue-50 p-1.5 text-blue-700">
                          <span className="font-semibold">Semantic:</span> {(result.reasons.denseRank * 100).toFixed(0)}%
                        </div>
                      )}
                      {result.reasons.keywordRank !== null && (
                        <div className="rounded bg-green-50 p-1.5 text-green-700">
                          <span className="font-semibold">Keywords:</span> {(result.reasons.keywordRank * 100).toFixed(0)}%
                        </div>
                      )}
                      {result.reasons.confidenceBoost > 0 && (
                        <div className="rounded bg-purple-50 p-1.5 text-purple-700">
                          <span className="font-semibold">Confidence:</span> +{(result.reasons.confidenceBoost * 100).toFixed(0)}%
                        </div>
                      )}
                      {result.reasons.recencyDecay > 0 && (
                        <div className="rounded bg-orange-50 p-1.5 text-orange-700 flex items-center gap-1">
                          <Clock size={12} />
                          <span className="font-semibold">Recent</span>
                        </div>
                      )}
                      {result.reasons.accessBoost > 0 && (
                        <div className="rounded bg-pink-50 p-1.5 text-pink-700">
                          <span className="font-semibold">Accessed:</span> +{(result.reasons.accessBoost * 100).toFixed(0)}%
                        </div>
                      )}
                      <div className="rounded bg-gray-50 p-1.5 text-gray-700">
                        <span className="font-semibold">RRF:</span> {(result.reasons.rrf * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Initial State */}
        {!hasSearched && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
            <div className="text-3xl">🔍</div>
            <p className="text-sm text-muted-foreground">
              Ask your Brain anything. Searches are semantic, meaning they understand intent, not just keywords.
            </p>
            <p className="text-xs text-muted-foreground">
              Results ranked by: semantic similarity · keyword match · confidence · recency · frequency
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
