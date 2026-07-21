import { useState, useEffect } from 'react'
import { BarChart3, CheckCircle, TrendingUp } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { cn } from '@/lib/utils'
import { CampaignDashboard } from '@/components/CampaignDashboard'
import { ReviewDashboard } from '@/components/ReviewDashboard'
import { MonthlyReportDashboard } from '@/components/MonthlyReportDashboard'

type Tab = 'campaigns' | 'review' | 'monthly'

const TABS = [
  { id: 'campaigns', label: 'Campaigns', icon: BarChart3 },
  { id: 'review', label: 'Review Queue', icon: CheckCircle },
  { id: 'monthly', label: 'Monthly Report', icon: TrendingUp },
] as const

export function Dashboards() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns')

  // Get tab from URL query param if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab') as Tab
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [])

  // Update URL when tab changes
  useEffect(() => {
    window.history.replaceState(null, '', `?tab=${activeTab}`)
  }, [activeTab])

  return (
    <AppShell activeConversationId={null} onSelectConversation={() => {}} onNewConversation={() => {}}>
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">Dashboards</h1>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-border">
              {TABS.map((tab) => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[2px]',
                      activeTab === tab.id
                        ? 'border-orange-500 text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <TabIcon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in duration-200">
            {activeTab === 'campaigns' && <CampaignDashboard />}
            {activeTab === 'review' && <ReviewDashboard />}
            {activeTab === 'monthly' && <MonthlyReportDashboard />}
          </div>
        </div>
      </main>
    </AppShell>
  )
}
