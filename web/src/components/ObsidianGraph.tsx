/**
 * ObsidianGraph — minimalist force-directed node graph in the style of
 * Obsidian's Graph View: one dominant hub, small gray leaf nodes fanned
 * radially around it, plain-text labels, no chrome.
 *
 * Physics: center gravity (pulls everything toward canvas center, strongest
 * on the hub) + charge repulsion (nodes push each other apart) + link
 * springs (connected nodes pull together). Settles into the "starburst"
 * radial layout from continuous simulation, not a fixed geometric layout —
 * matches the InteractiveKnowledgeGraph.tsx simulation shape in this repo,
 * retuned for center-gravity instead of wall-bounce containment.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Settings2, Search } from 'lucide-react'

export interface GraphNode {
  id: string
  label: string
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphEdge {
  source: string
  target: string
}

export interface ObsidianGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** id of the node treated as the primary hub (largest, darkest). Defaults to the highest-degree node. */
  centerId?: string
  className?: string
}

interface Forces {
  center: number
  repel: number
  linkDistance: number
}

const DEFAULT_FORCES: Forces = { center: 0.004, repel: 7000, linkDistance: 140 }

function degreeOf(id: string, edges: GraphEdge[]): number {
  let n = 0
  for (const e of edges) {
    if (e.source === id || e.target === id) n++
  }
  return n
}

export function ObsidianGraph({ nodes, edges, centerId, className }: ObsidianGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simNodesRef = useRef<GraphNode[]>([])
  const animationRef = useRef<number>()
  const [, forceRedraw] = useState(0)

  const [forces, setForces] = useState<Forces>(DEFAULT_FORCES)
  const [showForces, setShowForces] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Pan/zoom state
  const viewRef = useRef({ x: 0, y: 0, scale: 1 })
  const dragRef = useRef<{ mode: 'pan' | 'node' | null; nodeId?: string; lastX: number; lastY: number }>({
    mode: null,
    lastX: 0,
    lastY: 0,
  })

  const hubId = centerId ?? nodes.reduce<{ id: string; deg: number }>(
    (best, n) => {
      const d = degreeOf(n.id, edges)
      return d > best.deg ? { id: n.id, deg: d } : best
    },
    { id: nodes[0]?.id ?? '', deg: -1 },
  ).id

  // (Re)initialize sim nodes when the input node/edge set changes.
  useEffect(() => {
    const canvas = canvasRef.current
    const w = canvas?.clientWidth || 800
    const h = canvas?.clientHeight || 600
    simNodesRef.current = nodes.map((n) => {
      const angle = Math.random() * Math.PI * 2
      const dist = n.id === hubId ? 0 : 40 + Math.random() * 60
      return {
        ...n,
        x: n.x ?? w / 2 + Math.cos(angle) * dist,
        y: n.y ?? h / 2 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  // Physics + render loop.
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = `${container.clientWidth}px`
      canvas.style.height = `${container.clientHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const step = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      const simNodes = simNodesRef.current
      const byId = new Map(simNodes.map((n) => [n.id, n]))

      for (const node of simNodes) {
        if (dragRef.current.mode === 'node' && dragRef.current.nodeId === node.id) continue
        let ax = 0
        let ay = 0
        const isHub = node.id === hubId

        // Center gravity — hub pinned harder to center than leaves.
        const cx = w / 2
        const cy = h / 2
        ax += (cx - (node.x ?? cx)) * (isHub ? forces.center * 4 : forces.center)
        ay += (cy - (node.y ?? cy)) * (isHub ? forces.center * 4 : forces.center)

        // Charge repulsion between all node pairs.
        for (const other of simNodes) {
          if (other.id === node.id) continue
          const dx = (node.x ?? 0) - (other.x ?? 0)
          const dy = (node.y ?? 0) - (other.y ?? 0)
          const distSq = dx * dx + dy * dy || 1
          const dist = Math.sqrt(distSq)
          const f = forces.repel / distSq
          ax += (dx / dist) * f
          ay += (dy / dist) * f
        }

        // Link springs.
        for (const e of edges) {
          let otherId: string | null = null
          if (e.source === node.id) otherId = e.target
          else if (e.target === node.id) otherId = e.source
          if (!otherId) continue
          const other = byId.get(otherId)
          if (!other) continue
          const dx = (other.x ?? 0) - (node.x ?? 0)
          const dy = (other.y ?? 0) - (node.y ?? 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const stretch = dist - forces.linkDistance
          ax += (dx / dist) * stretch * 0.05
          ay += (dy / dist) * stretch * 0.05
        }

        const friction = 0.85
        node.vx = ((node.vx ?? 0) + ax) * friction
        node.vy = ((node.vy ?? 0) + ay) * friction
        node.x = (node.x ?? 0) + (node.vx ?? 0)
        node.y = (node.y ?? 0) + (node.vy ?? 0)
      }

      // --- draw ---
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(viewRef.current.x, viewRef.current.y)
      ctx.scale(viewRef.current.scale, viewRef.current.scale)

      const neighborIds = new Set<string>()
      const activeId = hoveredId
      if (activeId) {
        neighborIds.add(activeId)
        for (const e of edges) {
          if (e.source === activeId) neighborIds.add(e.target)
          if (e.target === activeId) neighborIds.add(e.source)
        }
      }
      const q = query.trim().toLowerCase()
      const matchIds = q
        ? new Set(simNodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id))
        : null

      // Edges
      for (const e of edges) {
        const s = byId.get(e.source)
        const t = byId.get(e.target)
        if (!s || !t) continue
        const dimmed = activeId ? !(neighborIds.has(e.source) && neighborIds.has(e.target)) : false
        ctx.strokeStyle = dimmed ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(s.x ?? 0, s.y ?? 0)
        ctx.lineTo(t.x ?? 0, t.y ?? 0)
        ctx.stroke()
      }

      // Nodes + labels
      for (const node of simNodes) {
        const isHub = node.id === hubId
        const deg = degreeOf(node.id, edges)
        const radius = isHub ? 13 : Math.min(4 + deg * 1.1, 11)
        const dimmed = (activeId && !neighborIds.has(node.id)) || (matchIds && !matchIds.has(node.id))

        ctx.fillStyle = isHub
          ? dimmed
            ? 'rgba(20,20,20,0.25)'
            : '#1a1a1a'
          : dimmed
            ? 'rgba(120,120,120,0.2)'
            : `rgba(110,110,110,${0.55 + Math.min(deg / 10, 1) * 0.35})`
        ctx.beginPath()
        ctx.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2)
        ctx.fill()

        if (!dimmed || isHub) {
          ctx.fillStyle = isHub ? '#111' : '#555'
          ctx.font = isHub ? '600 13px ui-sans-serif, system-ui, sans-serif' : '11px ui-sans-serif, system-ui, sans-serif'
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillText(node.label, (node.x ?? 0) + radius + 4, node.y ?? 0)
        }
      }

      ctx.restore()
      animationRef.current = requestAnimationFrame(step)
    }

    animationRef.current = requestAnimationFrame(step)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edges, forces, hoveredId, query, hubId])

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    return {
      x: (px - viewRef.current.x) / viewRef.current.scale,
      y: (py - viewRef.current.y) / viewRef.current.scale,
    }
  }, [])

  const nodeAt = useCallback((cx: number, cy: number) => {
    for (const node of simNodesRef.current) {
      const isHub = node.id === hubId
      const deg = degreeOf(node.id, edges)
      const radius = isHub ? 13 : Math.min(4 + deg * 1.1, 11)
      const dx = (node.x ?? 0) - cx
      const dy = (node.y ?? 0) - cy
      if (Math.sqrt(dx * dx + dy * dy) < radius + 8) return node
    }
    return null
  }, [edges, hubId])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const p = toCanvasPoint(e.clientX, e.clientY)
    const hit = nodeAt(p.x, p.y)
    if (hit) {
      dragRef.current = { mode: 'node', nodeId: hit.id, lastX: e.clientX, lastY: e.clientY }
    } else {
      dragRef.current = { mode: 'pan', lastX: e.clientX, lastY: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mode, nodeId, lastX, lastY } = dragRef.current
    if (mode === 'pan') {
      viewRef.current.x += e.clientX - lastX
      viewRef.current.y += e.clientY - lastY
      dragRef.current.lastX = e.clientX
      dragRef.current.lastY = e.clientY
    } else if (mode === 'node' && nodeId) {
      const p = toCanvasPoint(e.clientX, e.clientY)
      const node = simNodesRef.current.find((n) => n.id === nodeId)
      if (node) {
        node.x = p.x
        node.y = p.y
        node.vx = 0
        node.vy = 0
      }
    } else {
      const p = toCanvasPoint(e.clientX, e.clientY)
      const hit = nodeAt(p.x, p.y)
      setHoveredId(hit?.id ?? null)
      if (canvasRef.current) canvasRef.current.style.cursor = hit ? 'pointer' : 'grab'
    }
  }

  const handleMouseUp = () => {
    dragRef.current = { mode: null, lastX: 0, lastY: 0 }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const factor = Math.exp(-e.deltaY * 0.001)
    const newScale = Math.min(4, Math.max(0.25, viewRef.current.scale * factor))
    const rect = canvasRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    viewRef.current.x = px - ((px - viewRef.current.x) / viewRef.current.scale) * newScale
    viewRef.current.y = py - ((py - viewRef.current.y) / viewRef.current.scale) * newScale
    viewRef.current.scale = newScale
    forceRedraw((n) => n + 1)
  }

  return (
    <div ref={containerRef} className={className ?? 'relative w-full h-[600px] bg-white rounded-lg overflow-hidden'}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        data-testid="obsidian-graph-canvas"
      />

      {/* Toolbar */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          title="Search"
          data-testid="obsidian-graph-search-toggle"
          onClick={() => setShowSearch((v) => !v)}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 transition-colors"
        >
          <Search size={16} />
        </button>
        <button
          type="button"
          title="Forces"
          data-testid="obsidian-graph-forces-toggle"
          onClick={() => setShowForces((v) => !v)}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 transition-colors"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSearch && (
        <div className="absolute top-12 right-3 w-56 rounded-md border border-neutral-200 bg-white shadow-sm p-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter nodes…"
            data-testid="obsidian-graph-search-input"
            className="w-full text-sm px-2 py-1 rounded border border-neutral-200 outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      )}

      {showForces && (
        <div className="absolute top-12 right-3 w-56 rounded-md border border-neutral-200 bg-white shadow-sm p-3 space-y-3 text-xs text-neutral-600">
          <label className="block space-y-1">
            <span>Center force</span>
            <input
              type="range"
              min={0}
              max={0.08}
              step={0.002}
              value={forces.center}
              onChange={(e) => setForces((f) => ({ ...f, center: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <label className="block space-y-1">
            <span>Repel force</span>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={forces.repel}
              onChange={(e) => setForces((f) => ({ ...f, repel: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
          <label className="block space-y-1">
            <span>Link distance</span>
            <input
              type="range"
              min={10}
              max={200}
              step={5}
              value={forces.linkDistance}
              onChange={(e) => setForces((f) => ({ ...f, linkDistance: Number(e.target.value) }))}
              className="w-full"
            />
          </label>
        </div>
      )}
    </div>
  )
}
