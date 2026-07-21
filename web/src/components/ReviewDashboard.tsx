import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ReviewItem {
  id: string
  title?: string
  payload?: {
    firstName?: string
    lastName?: string
    company?: string
    headline?: string
    linkedinUrl?: string
  }
  qualificationScore?: number
  priority?: 'urgent' | 'high' | 'normal' | 'low'
  status?: string
}

interface ReviewData {
  items: ReviewItem[]
  totalPending?: number
  urgent?: number
  high?: number
  normal?: number
  low?: number
}

export function ReviewDashboard() {
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [stats, setStats] = useState({ total: 0, urgent: 0, high: 0, normal: 0, low: 0 })
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'score'>('priority')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadReviews = async () => {
    try {
      const res = await api.get<ReviewData>('/api/review/leads?status=pending&limit=100')
      setReviews(res.items || [])
      setStats({
        total: res.totalPending || res.items?.length || 0,
        urgent: res.urgent || res.items?.filter((i) => i.priority === 'urgent').length || 0,
        high: res.high || res.items?.filter((i) => i.priority === 'high').length || 0,
        normal: res.normal || res.items?.filter((i) => i.priority === 'normal').length || 0,
        low: res.low || res.items?.filter((i) => i.priority === 'low').length || 0,
      })
    } catch (err) {
      console.error('Failed to load reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const handleApprove = async (reviewId: string) => {
    setActionLoading(reviewId)
    try {
      await api.post(`/api/review/leads/${reviewId}/approve`, {})
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
    } catch (err) {
      console.error('Failed to approve review:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (reviewId: string) => {
    setActionLoading(reviewId)
    try {
      await api.post(`/api/review/leads/${reviewId}/reject`, { notes: 'Rejected' })
      setReviews((prev) => prev.filter((r) => r.id !== reviewId))
      setStats((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
    } catch (err) {
      console.error('Failed to reject review:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const filteredReviews = reviews
    .filter((r) => (filterPriority === 'all' ? true : r.priority === filterPriority))
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
      }
      return (b.qualificationScore || 0) - (a.qualificationScore || 0)
    })

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-muted-foreground'
    if (score >= 95) return 'text-confidence-high'
    if (score >= 85) return 'text-yellow-500'
    return 'text-orange-500'
  }

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-confidence-low/10 text-confidence-low'
      case 'high':
        return 'bg-orange-500/10 text-orange-500'
      case 'normal':
        return 'bg-yellow-500/10 text-yellow-500'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading review queue...</div>
  }

  if (stats.total === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-xl font-semibold text-foreground mb-2">All caught up! 🎉</p>
        <p className="text-muted-foreground">No leads pending review at this time.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Pending</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Urgent</p>
          <p className="text-2xl font-bold text-confidence-low">{stats.urgent}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">High</p>
          <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Normal</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.normal}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Low</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.low}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Filter Priority</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'score')}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="priority">Priority</option>
            <option value="score">Score (Highest First)</option>
          </select>
        </div>
      </div>

      {/* Review Items */}
      <div className="space-y-3">
        {filteredReviews.map((review) => {
          const leadName = `${review.payload?.firstName || ''} ${review.payload?.lastName || ''}`.trim() || review.title || 'Unknown'
          const isProcessing = actionLoading === review.id

          return (
            <div key={review.id} className="rounded-lg border border-border bg-card p-4 hover:bg-background/50 transition-colors">
              <div className="flex items-start gap-4 justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-semibold text-foreground truncate">{leadName}</p>
                    {review.qualificationScore !== undefined && (
                      <span className={`text-sm font-bold ${getScoreColor(review.qualificationScore)} px-2 py-1 bg-muted rounded`}>
                        {review.qualificationScore}
                      </span>
                    )}
                    {review.priority && (
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-md', getPriorityBadgeColor(review.priority))}>
                        {review.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{review.payload?.company || 'Company unknown'}</p>
                  {review.payload?.headline && <p className="text-xs text-muted-foreground">{review.payload.headline}</p>}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(review.id)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-confidence-high hover:bg-confidence-high/90 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(review.id)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-confidence-low hover:bg-confidence-low/90 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredReviews.length === 0 && (
        <div className="text-center text-muted-foreground py-8">No reviews match the selected filter.</div>
      )}
    </div>
  )
}
