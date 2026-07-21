import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MonthlyMetrics {
  totalLeads?: number
  totalConnections?: number
  totalAccepted?: number
  totalDMs?: number
  totalReplies?: number
  totalDemos?: number
  acceptRate?: number
  replyRate?: number
  connectRate?: number
  totalLeadsDelta?: number
  connectsDelta?: number
  acceptRateDelta?: number
  dmsDelta?: number
  replyRateDelta?: number
  demosDelta?: number
  topSourcesByReplyRate?: Array<{ source: string; rate: number; count: number }>
  topTagsByReplyRate?: Array<{ tag: string; rate: number; count: number }>
}

interface MonthlyReportData {
  metrics: MonthlyMetrics[]
}

function MetricCard({
  label,
  value,
  delta,
  format = 'number',
}: {
  label: string
  value: number | undefined
  delta: number | undefined
  format?: 'number' | 'percentage'
}) {
  const isDeltaPositive = delta !== undefined && delta >= 0
  const DeltaIcon = isDeltaPositive ? ArrowUpRight : ArrowDownRight

  const formattedValue =
    format === 'percentage'
      ? `${Math.round(value || 0)}%`
      : `${Math.round(value || 0).toLocaleString()}`

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-xs font-medium text-muted-foreground mb-3">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-foreground">{formattedValue}</p>
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded',
              isDeltaPositive ? 'bg-confidence-high/10 text-confidence-high' : 'bg-confidence-low/10 text-confidence-low',
            )}
          >
            <DeltaIcon size={14} />
            {Math.abs(delta)}%
          </div>
        )}
      </div>
    </div>
  )
}

export function MonthlyReportDashboard() {
  const [metrics, setMetrics] = useState<MonthlyMetrics | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true)
      try {
        const res = await api.get<MonthlyReportData>(`/api/campaigns/monthly-report?month=${selectedMonth}`)
        const monthMetrics = res.metrics?.[0]
        setMetrics(monthMetrics || null)
      } catch (err) {
        console.error('Failed to load monthly report:', err)
        setMetrics(null)
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [selectedMonth])

  // Generate month options (last 12 months)
  const monthOptions = []
  for (let i = 0; i < 12; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    monthOptions.push({ month, label })
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading monthly report...</div>
  }

  if (!metrics) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground mb-4">No campaigns active in {selectedMonth}</p>
        <button
          onClick={() => window.location.href = '/chat'}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium"
        >
          Create a campaign
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label className="block text-sm font-medium text-foreground mb-2">Select Month</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full md:w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.month} value={opt.month}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6-Metric Cards */}
      <div>
        <h3 className="font-semibold text-sm mb-4">Key Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Total Leads"
            value={metrics.totalLeads}
            delta={metrics.totalLeadsDelta}
            format="number"
          />
          <MetricCard
            label="Connections"
            value={metrics.totalConnections}
            delta={metrics.connectsDelta}
            format="number"
          />
          <MetricCard
            label="Accept Rate"
            value={metrics.acceptRate}
            delta={metrics.acceptRateDelta}
            format="percentage"
          />
          <MetricCard
            label="DMs Sent"
            value={metrics.totalDMs}
            delta={metrics.dmsDelta}
            format="number"
          />
          <MetricCard
            label="Reply Rate"
            value={metrics.replyRate}
            delta={metrics.replyRateDelta}
            format="percentage"
          />
          <MetricCard
            label="Demos Booked"
            value={metrics.totalDemos}
            delta={metrics.demosDelta}
            format="number"
          />
        </div>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sources */}
        {metrics.topSourcesByReplyRate && metrics.topSourcesByReplyRate.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">Top Sources by Reply Rate</h3>
            <div className="space-y-4">
              {metrics.topSourcesByReplyRate.slice(0, 5).map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{item.source}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(item.rate)}% ({item.count} leads)
                    </span>
                  </div>
                  <div className="w-full h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(item.rate, 100)}%` }}
                    >
                      {item.rate > 20 && (
                        <span className="text-xs font-semibold text-white">
                          {Math.round(item.rate)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Tags */}
        {metrics.topTagsByReplyRate && metrics.topTagsByReplyRate.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">Top Tags by Reply Rate</h3>
            <div className="space-y-4">
              {metrics.topTagsByReplyRate.slice(0, 5).map((item, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{item.tag}</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(item.rate)}% ({item.count} leads)
                    </span>
                  </div>
                  <div className="w-full h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${Math.min(item.rate, 100)}%` }}
                    >
                      {item.rate > 20 && (
                        <span className="text-xs font-semibold text-white">
                          {Math.round(item.rate)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Link to Full Report */}
      <div className="text-center">
        <a
          href="/monthly-report"
          className="text-sm text-orange-500 hover:text-orange-600 font-medium"
        >
          View full monthly report →
        </a>
      </div>
    </div>
  )
}
