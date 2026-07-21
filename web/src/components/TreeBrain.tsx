import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { X, ZoomIn, ZoomOut, Search } from 'lucide-react'

interface GraphNode {
  id: string
  name: string
  type: string
  color?: string
  x?: number
  y?: number
  vx?: number
  vy?: number
  size?: number
  metadata?: Record<string, unknown>
}

interface GraphLink {
  source: string
  target: string
  type?: string
}

interface TreeBrainProps {
  nodes?: GraphNode[]
  links?: GraphLink[]
}

// Fallback demo data when no nodes provided
const DEFAULT_DEMO_NODES: GraphNode[] = [
  { id: 'hub', name: 'Company Brain', type: 'hub', size: 60, color: '#8B7355' },
  { id: 'crm', name: 'CRM', type: 'source', size: 40, color: '#E74C3C' },
  { id: 'notion', name: 'Notion', type: 'source', size: 40, color: '#3498DB' },
  { id: 'docs', name: 'Documentation', type: 'source', size: 40, color: '#9B59B6' },
  { id: 'deals', name: 'Deals', type: 'item', size: 25, color: '#FF9977' },
  { id: 'contacts', name: 'Contacts', type: 'item', size: 25, color: '#FF9977' },
]

const DEFAULT_DEMO_LINKS: GraphLink[] = [
  { source: 'hub', target: 'crm' },
  { source: 'hub', target: 'notion' },
  { source: 'hub', target: 'docs' },
  { source: 'crm', target: 'deals' },
  { source: 'crm', target: 'contacts' },
]

export function TreeBrain({ nodes: propNodes = [], links: propLinks = [] }: TreeBrainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const animationRef = useRef<number>()
  const [panning, setPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const nodesRef = useRef<GraphNode[]>([])
  const currentLinksRef = useRef<GraphLink[]>([])

  // Use provided nodes/links or fallback to demo
  const displayNodes = (propNodes && propNodes.length > 0) ? propNodes : DEFAULT_DEMO_NODES
  const displayLinks = (propLinks && propLinks.length > 0) ? propLinks : DEFAULT_DEMO_LINKS

  // Initialize node positions if not set
  useEffect(() => {
    const width = canvasRef.current?.width || 800
    const height = canvasRef.current?.height || 600

    const initializedNodes = displayNodes.map((node) => ({
      ...node,
      x: node.x !== undefined ? node.x : Math.random() * width - width / 2,
      y: node.y !== undefined ? node.y : Math.random() * height - height / 2,
      vx: node.vx || 0,
      vy: node.vy || 0,
    }))

    nodesRef.current = initializedNodes
    currentLinksRef.current = displayLinks
  }, [displayNodes, displayLinks])

  // Physics simulation + rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#F5F5F7'
      ctx.fillRect(0, 0, width, height)

      // Physics simulation
      nodesRef.current.forEach(node => {
        let ax = 0
        let ay = 0

        // Repulsion from all other nodes
        nodesRef.current.forEach(other => {
          if (other.id === node.id) return
          const dx = (node.x || 0) - (other.x || 0)
          const dy = (node.y || 0) - (other.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 200 / (dist * dist)
          ax += (dx / dist) * force
          ay += (dy / dist) * force
        })

        // Attraction to linked nodes
        currentLinksRef.current.forEach(link => {
          const isSource = link.source === node.id
          const isTarget = link.target === node.id
          if (!isSource && !isTarget) return

          const other = nodesRef.current.find(n => n.id === (isSource ? link.target : link.source))
          if (!other) return

          const dx = (other.x || 0) - (node.x || 0)
          const dy = (other.y || 0) - (node.y || 0)
          ax += dx * 0.02
          ay += dy * 0.02
        })

        // Damping and update
        node.vx = ((node.vx || 0) + ax) * 0.95
        node.vy = ((node.vy || 0) + ay) * 0.95
        node.x = (node.x || 0) + (node.vx || 0)
        node.y = (node.y || 0) + (node.vy || 0)

        // Keep in bounds
        const margin = 200
        if (node.x! < -width / 2 + margin) { node.x = -width / 2 + margin; node.vx = 0 }
        if (node.x! > width / 2 - margin) { node.x = width / 2 - margin; node.vx = 0 }
        if (node.y! < -height / 2 + margin) { node.y = -height / 2 + margin; node.vy = 0 }
        if (node.y! > height / 2 - margin) { node.y = height / 2 - margin; node.vy = 0 }
      })

      // Save context
      ctx.save()
      ctx.translate(width / 2 + pan.x, height / 2 + pan.y)
      ctx.scale(scale, scale)

      // Draw links
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)'
      ctx.lineWidth = 1
      currentLinksRef.current.forEach(link => {
        const source = nodesRef.current.find(n => n.id === link.source)
        const target = nodesRef.current.find(n => n.id === link.target)
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x || 0, source.y || 0)
          ctx.lineTo(target.x || 0, target.y || 0)
          ctx.stroke()
        }
      })

      // Draw nodes
      nodesRef.current.forEach(node => {
        const isSelected = selectedNode?.id === node.id
        const isHovered = hoveredNode === node.id
        const isFiltered = searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())
        const radius = (node.size || 20) * (isSelected ? 1.3 : isHovered ? 1.15 : 1)

        // Node circle
        ctx.fillStyle = isFiltered ? 'rgba(200, 200, 200, 0.3)' : (node.color || '#CCCCCC')
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2)
        ctx.fill()

        // Border for selected
        if (isSelected) {
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.stroke()
        }

        // Label
        ctx.fillStyle = isFiltered ? 'rgba(100, 100, 100, 0.5)' : '#333333'
        ctx.font = `${isSelected ? 'bold' : 'normal'} 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Split long names
        const label = node.name
        if (label.length > 15) {
          const mid = Math.ceil(label.length / 2)
          const space = label.lastIndexOf(' ', mid)
          if (space > 0) {
            ctx.fillText(label.substring(0, space), node.x || 0, (node.y || 0) - 5)
            ctx.fillText(label.substring(space + 1), node.x || 0, (node.y || 0) + 5)
          } else {
            ctx.fillText(label, node.x || 0, node.y || 0)
          }
        } else {
          ctx.fillText(label, node.x || 0, node.y || 0)
        }
      })

      ctx.restore()

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [scale, pan, selectedNode, hoveredNode, searchTerm])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const canvasX = (x - canvas.width / 2 - pan.x) / scale
    const canvasY = (y - canvas.height / 2 - pan.y) / scale

    // Check click on node
    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - canvasX
      const dy = (node.y || 0) - canvasY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < (node.size || 20) * 1.3) {
        setSelectedNode(node)
        return
      }
    }
    setSelectedNode(null)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panning) {
      const dx = e.clientX - panStartRef.current.x
      const dy = e.clientY - panStartRef.current.y
      setPan(p => ({ x: p.x + dx, y: p.y + dy }))
      panStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const canvasX = (x - canvas.width / 2 - pan.x) / scale
    const canvasY = (y - canvas.height / 2 - pan.y) / scale

    let found = false
    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - canvasX
      const dy = (node.y || 0) - canvasY
      if (Math.sqrt(dx * dx + dy * dy) < (node.size || 20) * 1.3) {
        setHoveredNode(node.id)
        canvas.style.cursor = 'pointer'
        found = true
        break
      }
    }
    if (!found) {
      setHoveredNode(null)
      canvas.style.cursor = panning ? 'grabbing' : 'grab'
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    setPanning(false)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(s => Math.max(0.3, Math.min(4, s * delta)))
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden h-[800px]">
      <CardContent className="p-0 relative h-full bg-white">
        {/* Search Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={1400}
          height={800}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full"
        />

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button
            onClick={() => setScale(s => Math.min(4, s * 1.2))}
            className="w-10 h-10 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
          >
            <ZoomIn size={18} className="text-gray-700" />
          </button>
          <button
            onClick={() => setScale(s => Math.max(0.3, s * 0.8))}
            className="w-10 h-10 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
          >
            <ZoomOut size={18} className="text-gray-700" />
          </button>
        </div>

        {/* Info Panel */}
        {selectedNode && (
          <div className="absolute top-20 left-4 w-72 bg-white border border-gray-300 rounded-lg p-4 shadow-lg max-h-96 overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{selectedNode.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedNode.type.toUpperCase()}</p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Related nodes */}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">CONNECTED:</p>
              <div className="space-y-1 text-sm">
                {currentLinksRef.current
                  .filter(link => link.source === selectedNode.id || link.target === selectedNode.id)
                  .map(link => {
                    const relatedId = link.source === selectedNode.id ? link.target : link.source
                    const related = nodesRef.current.find((n: GraphNode) => n.id === relatedId)
                    return related ? (
                      <div
                        key={link.source + link.target}
                        className="text-gray-600 hover:text-gray-900 cursor-pointer py-1"
                        onClick={() => setSelectedNode(related)}
                      >
                        → {related.name}
                      </div>
                    ) : null
                  })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
