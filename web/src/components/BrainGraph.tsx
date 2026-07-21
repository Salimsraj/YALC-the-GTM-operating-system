import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


const SOURCES = [
  { id: 'markdown', label: 'Markdown\nFolders', color: '#3b82f6', icon: '📁' },
  { id: 'notion', label: 'Notion\nDatabases', color: '#a855f7', icon: '🗂️' },
  { id: 'gdrive', label: 'Google\nDrive', color: '#22c55e', icon: '☁️' },
  { id: 'campaigns', label: 'Campaign\nLearner', color: '#f97316', icon: '📊' },
]

export function BrainGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const centerX = width / 2
    const centerY = height / 2
    const brainRadius = 60

    // Draw connections (edges) first
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)'
    ctx.lineWidth = 2
    SOURCES.forEach((_source, i) => {
      const angle = (i / SOURCES.length) * Math.PI * 2 - Math.PI / 2
      const distance = 280
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance

      // Line from source to brain
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(centerX, centerY)
      ctx.stroke()
    })

    // Draw Brain (center)
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.arc(centerX, centerY, brainRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🧠', centerX, centerY - 8)
    ctx.font = '12px sans-serif'
    ctx.fillText('Your Brain', centerX, centerY + 12)

    // Draw data sources (nodes)
    SOURCES.forEach((source, i) => {
      const angle = (i / SOURCES.length) * Math.PI * 2 - Math.PI / 2
      const distance = 280
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      const radius = 50

      // Node circle
      ctx.fillStyle = source.color
      ctx.globalAlpha = 0.1
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalAlpha = 1
      ctx.strokeStyle = source.color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Icon
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = source.color
      ctx.fillText(source.icon, x, y - 12)

      // Label
      ctx.font = '11px sans-serif'
      ctx.fillStyle = '#333'
      const lines = source.label.split('\n')
      lines.forEach((line, j) => {
        ctx.fillText(line, x, y + 10 + j * 12)
      })
    })

    // Draw memory nodes (small dots between sources and brain)
    ctx.fillStyle = '#94a3b8'
    ctx.globalAlpha = 0.6
    for (let i = 0; i < SOURCES.length; i++) {
      const angle = (i / SOURCES.length) * Math.PI * 2 - Math.PI / 2
      const distance = 280
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance

      // 3 memory nodes along each line
      for (let j = 1; j <= 3; j++) {
        const t = j / 4
        const mx = centerX + (x - centerX) * t
        const my = centerY + (y - centerY) * t
        ctx.beginPath()
        ctx.arc(mx, my, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Knowledge</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-border rounded-lg bg-white max-w-full"
            style={{ maxHeight: '600px', width: 'auto' }}
          />
          <div className="mt-4 text-sm text-muted-foreground text-center max-w-md">
            <p className="mb-2">Your Brain collects knowledge from multiple sources.</p>
            <p>All data is indexed and searchable through semantic retrieval.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
