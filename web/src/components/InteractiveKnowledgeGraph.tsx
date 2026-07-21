import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Node {
  id: string
  label: string
  type: 'source' | 'data' | 'company'
  color: string
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface Link {
  source: string
  target: string
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

const DEMO_DATA: GraphData = {
  nodes: [
    // Central company
    { id: 'company', label: 'Company', type: 'company', color: '#f97316', x: 400, y: 300 },

    // Data sources
    { id: 'website', label: 'Website', type: 'source', color: '#3b82f6' },
    { id: 'notion', label: 'Notion', type: 'source', color: '#a855f7' },
    { id: 'gdrive', label: 'Google Drive', type: 'source', color: '#22c55e' },
    { id: 'crm', label: 'CRM', type: 'source', color: '#ef4444' },
    { id: 'sales-calls', label: 'Sales Calls', type: 'source', color: '#06b6d4' },
    { id: 'resources', label: 'Resources', type: 'source', color: '#eab308' },

    // Data extracted
    { id: 'team', label: 'Team', type: 'data', color: '#8b5cf6' },
    { id: 'products', label: 'Products', type: 'data', color: '#ec4899' },
    { id: 'tech-stack', label: 'Tech Stack', type: 'data', color: '#14b8a6' },
    { id: 'use-cases', label: 'Use Cases', type: 'data', color: '#f59e0b' },
    { id: 'signals', label: 'Signals', type: 'data', color: '#06b6d4' },
  ],
  links: [
    // Sources to company
    { source: 'website', target: 'company' },
    { source: 'notion', target: 'company' },
    { source: 'gdrive', target: 'company' },
    { source: 'crm', target: 'company' },
    { source: 'sales-calls', target: 'company' },
    { source: 'resources', target: 'company' },

    // Company to data
    { source: 'company', target: 'team' },
    { source: 'company', target: 'products' },
    { source: 'company', target: 'tech-stack' },
    { source: 'company', target: 'use-cases' },
    { source: 'company', target: 'signals' },

    // Cross-connections between data
    { source: 'team', target: 'signals' },
    { source: 'products', target: 'use-cases' },
    { source: 'tech-stack', target: 'products' },
  ],
}

export function InteractiveKnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [graphData, setGraphData] = useState<GraphData>(DEMO_DATA)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animationRef = useRef<number>()

  // Initialize node positions
  useEffect(() => {
    const width = canvasRef.current?.width || 800
    const height = canvasRef.current?.height || 600

    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        if (node.x === undefined) {
          const angle = Math.random() * Math.PI * 2
          const distance = node.type === 'company' ? 0 : 150
          return {
            ...node,
            x: width / 2 + Math.cos(angle) * distance,
            y: height / 2 + Math.sin(angle) * distance,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
          }
        }
        return node
      }),
    }))
  }, [])

  // Physics simulation + rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = '#0f0f0f'
      ctx.fillRect(0, 0, width, height)

      // Apply physics
      setGraphData((prev) => {
        const nodes = prev.nodes.map((node) => {
          let ax = 0
          let ay = 0
          const friction = 0.95
          const speed = 0.5

          // Repulsion between nodes
          for (const other of prev.nodes) {
            if (other.id === node.id) continue
            const dx = (node.x || 0) - (other.x || 0)
            const dy = (node.y || 0) - (other.y || 0)
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = 100 / (dist * dist)
            ax += (dx / dist) * force
            ay += (dy / dist) * force
          }

          // Attraction to links
          for (const link of prev.links) {
            if (link.source === node.id) {
              const target = prev.nodes.find((n) => n.id === link.target)
              if (target) {
                const dx = (target.x || 0) - (node.x || 0)
                const dy = (target.y || 0) - (node.y || 0)
                ax += dx * 0.05
                ay += dy * 0.05
              }
            } else if (link.target === node.id) {
              const source = prev.nodes.find((n) => n.id === link.source)
              if (source) {
                const dx = (source.x || 0) - (node.x || 0)
                const dy = (source.y || 0) - (node.y || 0)
                ax += dx * 0.05
                ay += dy * 0.05
              }
            }
          }

          // Apply forces
          let vx = ((node.vx || 0) + ax) * friction
          let vy = ((node.vy || 0) + ay) * friction
          let x = (node.x || 0) + vx * speed
          let y = (node.y || 0) + vy * speed

          // Bounce off edges
          if (x < 20) {
            x = 20
            vx *= -0.5
          }
          if (x > width - 20) {
            x = width - 20
            vx *= -0.5
          }
          if (y < 20) {
            y = 20
            vy *= -0.5
          }
          if (y > height - 20) {
            y = height - 20
            vy *= -0.5
          }

          return { ...node, x, y, vx, vy }
        })

        return { ...prev, nodes }
      })

      // Draw links
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)'
      ctx.lineWidth = 1
      for (const link of graphData.links) {
        const source = graphData.nodes.find((n) => n.id === link.source)
        const target = graphData.nodes.find((n) => n.id === link.target)
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x || 0, source.y || 0)
          ctx.lineTo(target.x || 0, target.y || 0)
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const node of graphData.nodes) {
        const radius = node.type === 'company' ? 30 : 20
        const isHovered = hoveredNode === node.id
        const isSelected = selectedNode?.id === node.id

        // Glow effect
        if (isHovered || isSelected) {
          ctx.fillStyle = node.color + '40'
          ctx.beginPath()
          ctx.arc(node.x || 0, node.y || 0, radius + 15, 0, Math.PI * 2)
          ctx.fill()
        }

        // Node circle
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2)
        ctx.fill()

        // Node border
        ctx.strokeStyle = isSelected ? '#fff' : node.color
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.stroke()

        // Node label
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.label, node.x || 0, node.y || 0)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [graphData, hoveredNode, selectedNode])

  // Mouse interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let found = false
    for (const node of graphData.nodes) {
      const radius = node.type === 'company' ? 30 : 20
      const dx = (node.x || 0) - x
      const dy = (node.y || 0) - y
      if (Math.sqrt(dx * dx + dy * dy) < radius + 10) {
        setHoveredNode(node.id)
        canvas.style.cursor = 'pointer'
        found = true
        break
      }
    }
    if (!found) {
      setHoveredNode(null)
      canvas.style.cursor = 'grab'
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    for (const node of graphData.nodes) {
      const radius = node.type === 'company' ? 30 : 20
      const dx = (node.x || 0) - x
      const dy = (node.y || 0) - y
      if (Math.sqrt(dx * dx + dy * dy) < radius + 10) {
        setSelectedNode(node)
        return
      }
    }
    setSelectedNode(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Second Brain — Knowledge Graph</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          {/* Canvas */}
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
              className="border border-border rounded-lg bg-black w-full cursor-grab active:cursor-grabbing"
              style={{ maxHeight: '600px' }}
            />
          </div>

          {/* Selected Node Details */}
          {selectedNode && (
            <div className="w-64 space-y-3">
              <div className="rounded-lg border border-border p-4">
                <div
                  className="w-8 h-8 rounded-full mb-2"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
                <Badge className="mt-2">{selectedNode.type}</Badge>

                {/* Connected nodes */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Connected to:</p>
                  <div className="space-y-1">
                    {graphData.links
                      .filter((l) => l.source === selectedNode.id || l.target === selectedNode.id)
                      .map((link) => {
                        const connectedId = link.source === selectedNode.id ? link.target : link.source
                        const connected = graphData.nodes.find((n) => n.id === connectedId)
                        return (
                          connected && (
                            <button
                              key={connectedId}
                              onClick={() => setSelectedNode(connected)}
                              className="w-full text-left text-xs rounded px-2 py-1 hover:bg-muted transition-colors"
                            >
                              • {connected.label}
                            </button>
                          )
                        )
                      })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span>Company</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Data Source</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500" />
            <span>Extracted Data</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">← Click nodes to explore</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
