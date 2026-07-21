/**
 * Temporary demo route for ObsidianGraph — not part of the primary nav.
 * Mirrors the "New wave" Obsidian screenshot dataset so the component's
 * visual output can be checked against the reference.
 */
import { ObsidianGraph, type GraphEdge, type GraphNode } from '@/components/ObsidianGraph'

const LEAVES = [
  'Victoria Luo', 'UGC campaigns', 'creator sourcing', 'content review', 'performance tracking',
  'creator payouts', 'workspace', 'Y Combinator', 'Replika', 'Hyperknow', 'Variant', 'Sorce',
  'Cantina', 'Agentcard', 'Tsenta', 'General Intelligence', 'Founders Inc', 'Jobright',
  'YC portfolio companies', 'GTM strategy', 'warm network outbound', 'demand-gen',
  'campaign management', 'AI agent', 'auto-match engine', 'creator brief',
  'audio-visual confidence score', 'creator retainer', 'delivery target', 'analytics dashboard',
  'engagement rate', 'CPM', 'breakouts', 'authentic vs scripted', 'NewWave MCP', 'Claude',
  'AI assistant integration', 'Sarfaraz', 'Ali Sheikh', 'Jason Pham', 'Melinda Yan',
  'Noel Evangelista', '@toriluoo', 'GTM', 'inbound strategy', 'outbound strategy',
  'landing page', 'FAQ block', 'social proof', 'trial-to-r…', 'go-to-market', 'monthly retainer',
  'managed tier', 'account warm-up', 'founder-led content', 'creator supply side', 'Instagram',
]

const nodes: GraphNode[] = [
  { id: 'hub', label: 'New wave' },
  { id: 'warm-lead-capture', label: 'warm lead capture' },
  ...LEAVES.map((label, i) => ({ id: `leaf-${i}`, label })),
]

const edges: GraphEdge[] = [
  ...LEAVES.map((_, i) => ({ source: 'hub', target: `leaf-${i}` })),
  { source: 'hub', target: 'warm-lead-capture' },
  { source: 'warm-lead-capture', target: 'leaf-0' },
  { source: 'warm-lead-capture', target: 'leaf-1' },
]

export function GraphDemo() {
  return (
    <main className="min-h-screen p-6">
      <ObsidianGraph nodes={nodes} edges={edges} centerId="hub" />
    </main>
  )
}
