/**
 * /brain — knowledge graph built from extracted data sources.
 *
 * The graph (ObsidianGraph) renders whatever is currently in useBrainState —
 * on load, that starts empty and is seeded automatically from the website
 * source (see WEBSITE_URL below). SecondBrainBuilder lets the user add more
 * sources on top, each merging into the same graph via useBrainState.
 */

import { useEffect, useRef, useState } from 'react'
import { ObsidianGraph } from '@/components/ObsidianGraph'
import { SecondBrainBuilder } from '@/components/SecondBrainBuilder'
import { useBrainState, type ExtractedNode } from '@/hooks/useBrainState'
import { eyebrowClass } from '@/lib/feedback'
import type { GraphEdge, GraphNode as ObsidianNode } from '@/components/ObsidianGraph'

const WEBSITE_URL = 'https://website-silk-ten-81.vercel.app/'

export function Brain() {
  const { nodes, links, addExtractedNodes, clearBrain, mergeInProgress } = useBrainState()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    clearBrain()
    setLoading(true)

    fetch('/api/brain/extract/website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: WEBSITE_URL }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Extraction failed: ${res.statusText}`)
        return res.json()
      })
      .then(async (result) => {
        if (!result.nodes) return
        const extracted: ExtractedNode[] = result.nodes.map((n: any) => ({
          type: n.type,
          name: n.name,
          content: n.content,
          metadata: n.metadata,
          relationships: n.relationships,
        }))
        await addExtractedNodes(extracted)
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load website data')
      })
      .finally(() => {
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const graphNodes: ObsidianNode[] = nodes.map((n) => ({ id: n.id, label: n.name }))
  const graphEdges: GraphEdge[] = links.map((l) => ({ source: l.source, target: l.target }))

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className={eyebrowClass}>Brain</p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Company Data Tree</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Nodes extracted from your website, laid out as a graph. Add more sources below to grow it.
          </p>
          {graphNodes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              {graphNodes.length} nodes • {graphEdges.length} connections
              {mergeInProgress && ' • Merging...'}
            </p>
          )}
          {loadError && <p className="text-xs text-destructive mt-3">{loadError}</p>}
        </header>

        {graphNodes.length > 0 ? (
          <ObsidianGraph
            nodes={graphNodes}
            edges={graphEdges}
            className="w-full h-[700px] bg-white rounded-lg overflow-hidden border border-border"
          />
        ) : (
          <div className="w-full h-[300px] rounded-lg border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
            {loadError ? 'Could not load website data.' : loading ? 'Extracting website…' : 'No nodes yet.'}
          </div>
        )}

        {/* Second Brain — Data Extraction & Ingestion */}
        <div className="mt-12">
          <h2 className="font-heading text-2xl font-bold mb-6">Connect Data Sources</h2>
          <SecondBrainBuilder onNodesExtracted={addExtractedNodes} onClear={clearBrain} />
        </div>
      </div>
    </main>
  )
}
