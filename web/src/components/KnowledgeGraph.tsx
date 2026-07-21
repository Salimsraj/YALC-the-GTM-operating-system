import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, AlertCircle, ArrowRight } from 'lucide-react'

interface Entity {
  id: string
  name: string
  type: 'company' | 'person' | 'tech' | 'product' | 'customer' | 'competitor' | 'insight'
  metadata?: Record<string, unknown>
  description?: string
}

interface EntityLink {
  id: string
  fromId: string
  toId: string
  relationshipType: string
  strength?: number
  source?: string
}

interface GraphNode extends Entity {
  x?: number
  y?: number
  vx?: number
  vy?: number
}

// Demo data matching Obsidian philosophy
const DEMO_ENTITIES: Entity[] = [
  {
    id: 'company-techcorp',
    name: 'TechCorp',
    type: 'company',
    description: 'Enterprise SaaS platform for infrastructure automation. Series B funded. Focus on cloud-native deployments.',
    metadata: { stage: 'Series B', industry: 'SaaS', employees: '150-200' }
  },
  {
    id: 'company-startupxyz',
    name: 'StartupXYZ',
    type: 'company',
    description: 'Early-stage AI/ML startup building predictive analytics tools. Strong technical team.',
    metadata: { stage: 'Series A', industry: 'AI/ML', employees: '20-30' }
  },
  {
    id: 'company-largeent',
    name: 'Large Enterprise',
    type: 'company',
    description: 'Fortune 500 company. Key buyer for B2B solutions. Long sales cycles.',
    metadata: { stage: 'Public', industry: 'Finance', employees: '5000+' }
  },

  {
    id: 'tech-react',
    name: 'React',
    type: 'tech',
    description: 'Frontend framework. Used by TechCorp and StartupXYZ for UI development.',
  },
  {
    id: 'tech-nodejs',
    name: 'Node.js',
    type: 'tech',
    description: 'Backend runtime. Used for API servers and microservices.',
  },
  {
    id: 'tech-postgresql',
    name: 'PostgreSQL',
    type: 'tech',
    description: 'Relational database. Primary data store for TechCorp infrastructure.',
  },
  {
    id: 'tech-vue',
    name: 'Vue',
    type: 'tech',
    description: 'Frontend framework used by StartupXYZ.',
  },

  {
    id: 'person-john',
    name: 'John Smith',
    type: 'person',
    description: 'CTO at TechCorp. 15 years infrastructure experience. Key decision maker.',
    metadata: { role: 'CTO', company: 'TechCorp' }
  },
  {
    id: 'person-sarah',
    name: 'Sarah Chen',
    type: 'person',
    description: 'CEO & Founder at StartupXYZ. Former engineer at Google. Strong technical background.',
    metadata: { role: 'CEO', company: 'StartupXYZ' }
  },
  {
    id: 'person-mike',
    name: 'Mike Johnson',
    type: 'person',
    description: 'VP Engineering at StartupXYZ. Building the core AI platform.',
    metadata: { role: 'VP Eng', company: 'StartupXYZ' }
  },
]

const DEMO_LINKS: EntityLink[] = [
  // TechCorp uses tech
  { id: 'l1', fromId: 'company-techcorp', toId: 'tech-react', relationshipType: 'uses', strength: 0.95, source: 'website' },
  { id: 'l2', fromId: 'company-techcorp', toId: 'tech-nodejs', relationshipType: 'uses', strength: 0.9, source: 'website' },
  { id: 'l3', fromId: 'company-techcorp', toId: 'tech-postgresql', relationshipType: 'uses', strength: 0.85, source: 'website' },

  // StartupXYZ uses tech
  { id: 'l4', fromId: 'company-startupxyz', toId: 'tech-react', relationshipType: 'uses', strength: 0.92, source: 'website' },
  { id: 'l5', fromId: 'company-startupxyz', toId: 'tech-nodejs', relationshipType: 'uses', strength: 0.88, source: 'website' },

  // Large Enterprise uses Vue
  { id: 'l6', fromId: 'company-largeent', toId: 'tech-vue', relationshipType: 'uses', strength: 0.8, source: 'linkedin' },

  // People work at companies
  { id: 'l7', fromId: 'person-john', toId: 'company-techcorp', relationshipType: 'works_at', strength: 1, source: 'linkedin' },
  { id: 'l8', fromId: 'person-sarah', toId: 'company-startupxyz', relationshipType: 'works_at', strength: 1, source: 'linkedin' },
  { id: 'l9', fromId: 'person-mike', toId: 'company-startupxyz', relationshipType: 'works_at', strength: 1, source: 'linkedin' },

  // Competitors
  { id: 'l10', fromId: 'company-techcorp', toId: 'company-startupxyz', relationshipType: 'competes_with', strength: 0.7, source: 'research' },
]

const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
  company: { bg: '#f97316', text: '#fff' },
  person: { bg: '#8b5cf6', text: '#fff' },
  tech: { bg: '#3b82f6', text: '#fff' },
  product: { bg: '#ec4899', text: '#fff' },
  customer: { bg: '#22c55e', text: '#fff' },
  competitor: { bg: '#ef4444', text: '#fff' },
  insight: { bg: '#eab308', text: '#000' },
}

export function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links] = useState<EntityLink[]>(DEMO_LINKS)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<GraphNode[]>([])

  // Initialize positions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const width = canvas.width
    const height = canvas.height

    const initialNodes = DEMO_ENTITIES.map((node) => {
      const angle = Math.random() * Math.PI * 2
      const distance = node.type === 'company' ? 80 : 180
      return {
        ...node,
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
      }
    })

    setNodes(initialNodes)
    nodesRef.current = initialNodes
  }, [])

  // Enhanced physics simulation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    nodesRef.current = nodes

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear with dark background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, width, height)

      // Physics simulation with improved forces
      const currentNodes = nodesRef.current
      const newNodes = currentNodes.map((node) => {
        let ax = 0
        let ay = 0

        // Strong repulsion from all other nodes
        for (const other of currentNodes) {
          if (other.id === node.id) continue
          const dx = (node.x || 0) - (other.x || 0)
          const dy = (node.y || 0) - (other.y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 400 / (dist * dist)
          ax += (dx / dist) * force
          ay += (dy / dist) * force
        }

        // Attraction via links
        for (const link of links) {
          if (link.fromId === node.id) {
            const target = currentNodes.find((n) => n.id === link.toId)
            if (target) {
              const dx = (target.x || 0) - (node.x || 0)
              const dy = (target.y || 0) - (node.y || 0)
              ax += dx * 0.06 * (link.strength || 0.8)
              ay += dy * 0.06 * (link.strength || 0.8)
            }
          } else if (link.toId === node.id) {
            const source = currentNodes.find((n) => n.id === link.fromId)
            if (source) {
              const dx = (source.x || 0) - (node.x || 0)
              const dy = (source.y || 0) - (node.y || 0)
              ax += dx * 0.06 * (link.strength || 0.8)
              ay += dy * 0.06 * (link.strength || 0.8)
            }
          }
        }

        // Damping and velocity update
        let vx = ((node.vx || 0) + ax) * 0.92
        let vy = ((node.vy || 0) + ay) * 0.92
        let x = (node.x || 0) + vx * 0.5
        let y = (node.y || 0) + vy * 0.5

        // Bounds
        if (x < 40) {
          x = 40
          vx *= -0.5
        }
        if (x > width - 40) {
          x = width - 40
          vx *= -0.5
        }
        if (y < 40) {
          y = 40
          vy *= -0.5
        }
        if (y > height - 40) {
          y = height - 40
          vy *= -0.5
        }

        return { ...node, x, y, vx, vy }
      })

      nodesRef.current = newNodes
      setNodes(newNodes)

      // Draw links
      for (const link of links) {
        const source = newNodes.find((n) => n.id === link.fromId)
        const target = newNodes.find((n) => n.id === link.toId)
        if (source && target) {
          const strength = link.strength || 0.5
          ctx.strokeStyle = `rgba(148, 163, 184, ${0.15 + strength * 0.2})`
          ctx.lineWidth = 1 + strength * 2
          ctx.beginPath()
          ctx.moveTo(source.x || 0, source.y || 0)
          ctx.lineTo(target.x || 0, target.y || 0)
          ctx.stroke()
        }
      }

      // Draw nodes
      for (const node of newNodes) {
        const isSelected = selectedEntity?.id === node.id
        const isHovered = hoveredNode === node.id
        const colors = ENTITY_COLORS[node.type]
        const radius = isSelected ? 32 : isHovered ? 28 : 22
        const glowSize = radius + 8

        if (isHovered || isSelected) {
          ctx.fillStyle = colors.bg + '20'
          ctx.beginPath()
          ctx.arc(node.x || 0, node.y || 0, glowSize, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = colors.bg
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = isSelected ? '#fff' : colors.bg
        ctx.lineWidth = isSelected ? 4 : 2
        ctx.stroke()

        ctx.fillStyle = colors.text
        ctx.font = isSelected ? 'bold 12px sans-serif' : 'bold 11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.name.substring(0, 12), node.x || 0, node.y || 0)
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [links, selectedEntity, hoveredNode, nodes.length])

  // Mouse handling
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let found = false
    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - x
      const dy = (node.y || 0) - y
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
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

    for (const node of nodesRef.current) {
      const dx = (node.x || 0) - x
      const dy = (node.y || 0) - y
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        setSelectedEntity(node)
        return
      }
    }
    setSelectedEntity(null)
  }

  // Get entity details
  const getForwardLinks = (entityId: string) =>
    links.filter((l) => l.fromId === entityId)

  const getBacklinks = (entityId: string) =>
    links.filter((l) => l.toId === entityId)

  const getConnectedEntities = (link: EntityLink) => {
    if (link.fromId === selectedEntity?.id) {
      return nodes.find((n) => n.id === link.toId)
    } else {
      return nodes.find((n) => n.id === link.fromId)
    }
  }

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardTitle className="text-xl">Knowledge Graph</CardTitle>
        <p className="text-xs text-slate-300 mt-1">Interactive network visualization with backlinks</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex gap-0 h-[700px]">
          {/* Canvas */}
          <div className="flex-1">
            <canvas
              ref={canvasRef}
              width={1000}
              height={700}
              onMouseMove={handleMouseMove}
              onClick={handleClick}
              className="w-full cursor-grab active:cursor-grabbing bg-slate-950"
              style={{ display: 'block' }}
            />
          </div>

          {/* Sidebar */}
          {selectedEntity ? (
            <div className="w-96 border-l border-slate-200 bg-slate-50 flex flex-col">
              {/* Header */}
              <div className="bg-white p-4 border-b border-slate-200 sticky top-0 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: ENTITY_COLORS[selectedEntity.type].bg }}
                  >
                    {selectedEntity.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg text-slate-900">{selectedEntity.name}</h3>
                    <Badge className="mt-1" style={{ backgroundColor: ENTITY_COLORS[selectedEntity.type].bg }}>
                      {selectedEntity.type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedEntity.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">About</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedEntity.description}</p>
                  </div>
                )}

                {selectedEntity.metadata && Object.keys(selectedEntity.metadata).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Details</p>
                    <div className="space-y-2">
                      {Object.entries(selectedEntity.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-start">
                          <span className="text-xs font-medium text-slate-600">{key}:</span>
                          <span className="text-xs text-slate-700 text-right">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Forward Links */}
                {getForwardLinks(selectedEntity.id).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                      Connected To ({getForwardLinks(selectedEntity.id).length})
                    </p>
                    <div className="space-y-2">
                      {getForwardLinks(selectedEntity.id).map((link) => {
                        const entity = getConnectedEntities(link)
                        return (
                          entity && (
                            <button
                              key={link.id}
                              onClick={() => setSelectedEntity(entity)}
                              className="w-full text-left p-2 rounded border border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <ArrowRight size={12} className="text-slate-400 group-hover:text-orange-600" />
                                <span className="font-medium text-sm text-slate-700 group-hover:text-orange-600">
                                  {entity.name}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 ml-6">{link.relationshipType.replace(/_/g, ' ')}</div>
                              {link.source && <div className="text-xs text-slate-400 mt-1 ml-6">via {link.source}</div>}
                            </button>
                          )
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Backlinks */}
                {getBacklinks(selectedEntity.id).length > 0 && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-xs font-semibold text-orange-700 uppercase mb-2">
                      <AlertCircle className="inline mr-1" size={12} />
                      Mentioned In ({getBacklinks(selectedEntity.id).length})
                    </p>
                    <div className="space-y-2">
                      {getBacklinks(selectedEntity.id).map((link) => {
                        const entity = getConnectedEntities(link)
                        return (
                          entity && (
                            <button
                              key={link.id}
                              onClick={() => setSelectedEntity(entity)}
                              className="w-full text-left p-2 rounded border border-orange-200 hover:border-orange-400 hover:bg-orange-100 transition-colors group"
                            >
                              <span className="font-medium text-sm text-orange-700 group-hover:text-orange-900">
                                {entity.name}
                              </span>
                              <div className="text-xs text-orange-600 mt-1">{link.relationshipType.replace(/_/g, ' ')}</div>
                            </button>
                          )
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-96 border-l border-slate-200 bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center text-center p-6">
              <div className="text-4xl mb-3">🔍</div>
              <p className="font-semibold text-slate-700">Click any node</p>
              <p className="text-xs text-slate-500 mt-1">to explore connections and see backlinks</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
