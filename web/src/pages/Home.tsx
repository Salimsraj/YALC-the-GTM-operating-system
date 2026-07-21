import { useEffect, useState } from 'react'
import { ArrowUpRight, ArrowDownRight, Zap, CheckCircle, TrendingUp, Plus, LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface StatusData {
  activeCampaigns: number
  totalCampaigns: number
  pendingReviews: number
  monthlyReplyRate: number
  monthlyReplyRateDelta: number
}

function StatCard({
  label,
  value,
  subtext,
  delta,
  icon: Icon,
}: {
  label: string
  value: string | number
  subtext?: string
  delta?: number
  icon: LucideIcon
}) {
  const isDeltaPositive = delta !== undefined && delta >= 0
  const DeltaIcon = isDeltaPositive ? ArrowUpRight : ArrowDownRight

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
          <Icon size={20} className="text-orange-500" />
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isDeltaPositive ? 'text-confidence-high' : 'text-confidence-low',
            )}
          >
            <DeltaIcon size={14} />
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  )
}

interface ActionCardProps {
  title: string
  prompt: string
  icon: LucideIcon
  onClick: () => void
}

function ActionCard({ title, prompt, icon: Icon, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border bg-card p-6 hover:bg-background hover:shadow-md transition-all text-left group"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 mb-3 group-hover:bg-orange-500/20 transition">
        <Icon size={20} className="text-orange-500" />
      </div>
      <p className="font-semibold text-sm text-foreground mb-2">{title}</p>
      <p className="text-xs text-muted-foreground italic">{prompt}</p>
    </button>
  )
}

interface RecentCampaign {
  id: string
  title: string
  status: 'draft' | 'planning' | 'active' | 'paused' | 'completed' | 'failed'
  metrics?: {
    sent?: number
    replies?: number
    replyRate?: number
  }
}

interface RecentReview {
  id: string
  title?: string
  payload?: {
    firstName?: string
    lastName?: string
    company?: string
  }
  qualificationScore?: number
  priority?: string
}

export function Home() {
  const [stats, setStats] = useState<StatusData | null>(null)
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([])
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [campaignsRes, reviewsRes, monthlyRes] = await Promise.all([
          api.get<{ campaigns: any[] }>('/api/campaigns?limit=3'),
          api.get<{ items: RecentReview[] }>('/api/review/leads?status=pending&limit=3'),
          api.get<{ totalLeads?: number; totalReplies?: number; totalConnections?: number; metrics?: any[] }>('/api/campaigns/monthly-report'),
        ])

        const campaigns = campaignsRes.campaigns || []
        const allCampaigns = await api.get<{ campaigns: any[] }>('/api/campaigns')
        const activeCampaigns = allCampaigns.campaigns?.filter((c) => c.status === 'active').length || 0

        setStats({
          activeCampaigns,
          totalCampaigns: allCampaigns.campaigns?.length || 0,
          pendingReviews: reviewsRes.items?.length || 0,
          monthlyReplyRate: monthlyRes.metrics?.[0]?.replyRate || 0,
          monthlyReplyRateDelta: monthlyRes.metrics?.[0]?.replyRateDelta || 0,
        })

        setRecentCampaigns(campaigns)
        setRecentReviews(reviewsRes.items || [])
      } catch (err) {
        console.error('Failed to load home data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleNavigate = (path: string) => {
    window.history.pushState(null, '', path)
    window.location.href = path
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <AppShell activeConversationId={null} onSelectConversation={() => {}} onNewConversation={() => {}}>
      <main className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mb-12">
          <StatCard
            label="Active Campaigns"
            value={`${stats?.activeCampaigns || 0}/${stats?.totalCampaigns || 0}`}
            subtext="running now"
            icon={TrendingUp}
          />
          <StatCard
            label="Review Queue"
            value={stats?.pendingReviews || 0}
            subtext="pending approval"
            icon={CheckCircle}
          />
          <StatCard
            label="Monthly Reply Rate"
            value={`${Math.round(stats?.monthlyReplyRate || 0)}%`}
            delta={stats?.monthlyReplyRateDelta}
            icon={TrendingUp}
          />
        </div>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="font-heading text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-4">
            <ActionCard
              title="Find Leads"
              prompt="Search for prospects matching your ICP"
              icon={Zap}
              onClick={() => handleNavigate('/chat')}
            />
            <ActionCard
              title="New Campaign"
              prompt="Launch an outreach campaign"
              icon={Plus}
              onClick={() => handleNavigate('/chat')}
            />
            <ActionCard
              title="Review Queue"
              prompt="Approve or reject pending leads"
              icon={CheckCircle}
              onClick={() => handleNavigate('/dashboards?tab=review')}
            />
            <ActionCard
              title="View Reports"
              prompt="See your monthly performance"
              icon={TrendingUp}
              onClick={() => handleNavigate('/dashboards')}
            />
          </div>
        </section>

        {/* Recent Campaigns */}
        {recentCampaigns.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Recent Campaigns</h2>
              <a href="/dashboards?tab=campaigns" className="text-sm text-orange-500 hover:text-orange-600">
                View all →
              </a>
            </div>
            <div className="space-y-2">
              {recentCampaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-lg border border-border bg-card p-4 hover:bg-background transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">{campaign.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {campaign.metrics?.sent || 0} sent • {campaign.metrics?.replies || 0} replies
                        {campaign.metrics?.replyRate && ` • ${Math.round(campaign.metrics.replyRate)}% reply rate`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-md',
                        campaign.status === 'active'
                          ? 'bg-confidence-high/10 text-confidence-high'
                          : campaign.status === 'draft'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-orange-500/10 text-orange-500',
                      )}
                    >
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Pending Review</h2>
              <a href="/dashboards?tab=review" className="text-sm text-orange-500 hover:text-orange-600">
                View all →
              </a>
            </div>
            <div className="space-y-2">
              {recentReviews.map((review) => {
                const leadName = `${review.payload?.firstName || ''} ${review.payload?.lastName || ''}`.trim() || review.title || 'Unknown'
                const scoreColor =
                  (review.qualificationScore || 0) >= 95
                    ? 'text-confidence-high'
                    : (review.qualificationScore || 0) >= 85
                      ? 'text-yellow-500'
                      : 'text-orange-500'

                return (
                  <div key={review.id} className="rounded-lg border border-border bg-card p-4 hover:bg-background transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{leadName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{review.payload?.company || 'Company unknown'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {review.qualificationScore !== undefined && (
                          <span className={`text-sm font-bold ${scoreColor}`}>{review.qualificationScore}</span>
                        )}
                        {review.priority && (
                          <span
                            className={cn(
                              'text-xs font-medium px-2 py-1 rounded-md',
                              review.priority === 'urgent'
                                ? 'bg-confidence-low/10 text-confidence-low'
                                : review.priority === 'high'
                                  ? 'bg-orange-500/10 text-orange-500'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {review.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
        </div>
      </main>
    </AppShell>
  )
}
