import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Campaign {
  id: string
  name: string
  status: string
  sent?: number
  delivered?: number
  opened?: number
  clicked?: number
  replied?: number
  interested?: number
  unsubscribed?: number
  openRate?: number
  clickRate?: number
  replyRate?: number
  interestedRate?: number
}

// Demo campaigns for template
// Revenue per meeting (configurable)
const REVENUE_PER_MEETING = 1000

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: 'demo-1',
    name: 'Q3 Tech Leads Outreach',
    status: 'running',
    sent: 5200,
    delivered: 5100,
    opened: 1836,
    clicked: 183,
    replied: 234,
    interested: 67,
    unsubscribed: 12,
    openRate: 35.3,
    clickRate: 3.5,
    replyRate: 4.5,
    interestedRate: 1.3,
  },
  {
    id: 'demo-2',
    name: 'SaaS Founders - Series A',
    status: 'running',
    sent: 2840,
    delivered: 2800,
    opened: 896,
    clicked: 142,
    replied: 185,
    interested: 42,
    unsubscribed: 8,
    openRate: 31.5,
    clickRate: 5.0,
    replyRate: 6.5,
    interestedRate: 1.5,
  },
  {
    id: 'demo-3',
    name: 'CTOs at Healthcare',
    status: 'paused',
    sent: 1540,
    delivered: 1512,
    opened: 621,
    clicked: 86,
    replied: 97,
    interested: 28,
    unsubscribed: 5,
    openRate: 40.2,
    clickRate: 5.6,
    replyRate: 6.3,
    interestedRate: 1.8,
  },
  {
    id: 'demo-4',
    name: 'VP Sales - Fortune 500',
    status: 'completed',
    sent: 3200,
    delivered: 3150,
    opened: 1344,
    clicked: 201,
    replied: 256,
    interested: 89,
    unsubscribed: 15,
    openRate: 42.6,
    clickRate: 6.4,
    replyRate: 8.1,
    interestedRate: 2.8,
  },
]

// Generate demo timeline data
function generateTimelineData(campaign: Campaign) {
  const sent = campaign.sent || 5200
  const delivered = campaign.delivered || Math.round(sent * 0.98)
  const opened = campaign.opened || Math.round(sent * 0.35)
  const clicked = campaign.clicked || Math.round(sent * 0.035)
  const replied = campaign.replied || Math.round(sent * 0.045)
  const interested = campaign.interested || Math.round(sent * 0.013)

  // Create 30-day timeline
  const timeline = []
  for (let day = 1; day <= 30; day++) {
    const dayPercent = Math.min(day / 30, 1)
    const curve = Math.sin((dayPercent * Math.PI) / 2) // Ease-in curve

    timeline.push({
      date: `Day ${day}`,
      Contacted: Math.round(sent * dayPercent),
      Delivered: Math.round(delivered * dayPercent),
      Opened: Math.round(opened * curve),
      Clicked: Math.round(clicked * curve),
      Replied: Math.round(replied * curve),
      Interested: Math.round(interested * curve),
    })
  }
  return timeline
}

// Time-series funnel chart
function FunnelChart({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) {
    return <div className="h-80 flex items-center justify-center text-muted-foreground">Select a campaign to view funnel</div>
  }

  const timelineData = generateTimelineData(campaign)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold text-sm mb-6">Lead Funnel Over Time</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6',
            }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af', fontSize: '12px' }} />
          <Line type="monotone" dataKey="Contacted" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Delivered" stroke="#10b981" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Opened" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Clicked" stroke="#ef4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Replied" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Interested" stroke="#06b6d4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Funnel breakdown (current state)
function FunnelBreakdown({ campaign }: { campaign: Campaign | null }) {
  if (!campaign) {
    return <div className="h-80 flex items-center justify-center text-muted-foreground">Select a campaign</div>
  }

  const stages = [
    { label: 'Contacted', value: campaign.sent || 0, color: '#3b82f6' },
    { label: 'Delivered', value: campaign.delivered || 0, color: '#10b981' },
    { label: 'Opened', value: campaign.opened || 0, color: '#f59e0b' },
    { label: 'Clicked or Accepted invitation', value: campaign.clicked || 0, color: '#ef4444' },
    { label: 'Replied', value: campaign.replied || 0, color: '#8b5cf6' },
    { label: 'Interested', value: campaign.interested || 0, color: '#06b6d4' },
    { label: 'Unsubscribed', value: campaign.unsubscribed || 0, color: '#6b7280' },
  ]

  const total = campaign.sent || 0

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="font-semibold text-sm mb-6">Lead Funnel Overview</h3>
      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const percentage = total > 0 ? Math.round((stage.value / total) * 100) : 0

          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{stage.label}</span>
                <span className="text-xs text-muted-foreground">
                  {stage.value.toLocaleString()} {percentage > 0 && `(${percentage} %)`}
                </span>
              </div>
              {percentage > 0 && (
                <div className="w-full h-6 bg-muted rounded-sm overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${Math.max(percentage, 3)}%`, backgroundColor: stage.color }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CampaignDashboard() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(DEMO_CAMPAIGNS[0]?.id || null)

  const selectedCampaign = DEMO_CAMPAIGNS.find((c) => c.id === selectedCampaignId) || null

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <div className="rounded-lg border border-border bg-card p-4">
        <label className="block text-sm font-medium text-foreground mb-2">Select Campaign</label>
        <select
          value={selectedCampaignId || ''}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          className="w-full md:w-64 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {DEMO_CAMPAIGNS.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FunnelChart campaign={selectedCampaign} />
        </div>
        <div>
          <FunnelBreakdown campaign={selectedCampaign} />
        </div>
      </div>

      {/* Campaign Summary */}
      {selectedCampaign && (
        <>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-semibold text-sm mb-4">Campaign Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <p className="font-semibold text-foreground text-sm">{selectedCampaign.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <p className="font-semibold text-foreground text-sm capitalize">{selectedCampaign.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
                <p className="font-semibold text-foreground text-sm">{(selectedCampaign.sent || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Replied</p>
                <p className="font-semibold text-foreground text-sm">{(selectedCampaign.replied || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Meetings Booked</p>
              <p className="text-4xl font-bold text-foreground mb-1">{(selectedCampaign.interested || 0)}</p>
              <p className="text-xs text-muted-foreground">From interested leads</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-medium text-muted-foreground mb-2">Revenue per Meeting</p>
              <p className="text-4xl font-bold text-orange-500 mb-1">${REVENUE_PER_MEETING.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Average deal value</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <p className="text-xs font-medium text-muted-foreground mb-2">Total Revenue Potential</p>
              <p className="text-4xl font-bold text-orange-500 mb-1">
                ${((selectedCampaign.interested || 0) * REVENUE_PER_MEETING).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">If all meetings convert</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
