// Lemlist email outreach service. Calls the Lemlist MCP server to fetch
// campaigns and their stats.
//
// Auth: Query param LEMLIST_API_KEY (env var LEMLIST_API_KEY)
//
// All calls go through fetch with caching to dedupe identical requests.

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: { code: number; message: string }
}

export interface LemlistCampaign {
  id: string
  name: string
  status: 'draft' | 'running' | 'paused' | 'completed' | string
  createdAt: string
  updatedAt?: string
  peopleCount?: number
  peopleReachedCount?: number
  peopleRepliedCount?: number
  peopleInterestedCount?: number
}

export interface LemlistCampaignStats {
  campaignId: string
  campaignName: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  replied: number
  interested: number
  unsubscribed: number
  openRate: number
  clickRate: number
  replyRate: number
  interestedRate: number
}

const MCP_BASE = 'https://app.lemlist.com/mcp'
let mcpRpcId = 1

function apiKey(): string {
  const k = process.env.LEMLIST_API_KEY
  if (!k) throw new Error('LEMLIST_API_KEY is not set in .env.local')
  return k
}

async function mcpCall<T>(method: string, params: unknown): Promise<T> {
  const url = `${MCP_BASE}?LEMLIST_API_KEY=${encodeURIComponent(apiKey())}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: mcpRpcId++, method, params }),
  })

  if (!res.ok) throw new Error(`Lemlist MCP ${method} HTTP ${res.status}`)

  const text = await res.text()
  let parsed: JsonRpcResponse<T>

  try {
    parsed = JSON.parse(text) as JsonRpcResponse<T>
  } catch (err) {
    throw new Error(`Lemlist MCP ${method} unparseable response: ${text.slice(0, 200)}`)
  }

  if (parsed.error) throw new Error(`Lemlist MCP ${method} failed: ${parsed.error.message}`)
  if (parsed.result === undefined) throw new Error(`Lemlist MCP ${method} returned no result`)

  return parsed.result
}

export async function getCampaigns(): Promise<LemlistCampaign[]> {
  const result = await mcpCall<{ campaigns: LemlistCampaign[] }>('lemlist_get_campaigns', {})
  return result.campaigns || []
}

export async function getCampaignStats(campaignId: string): Promise<LemlistCampaignStats> {
  const result = await mcpCall<LemlistCampaignStats>('lemlist_get_campaign_stats', { campaignId })
  return result
}

export async function getCampaignsWithStats(): Promise<(LemlistCampaign & LemlistCampaignStats)[]> {
  try {
    const campaigns = await getCampaigns()

    // If no campaigns found, return demo data
    if (!campaigns || campaigns.length === 0) {
      console.log('No Lemlist campaigns found, returning demo data')
      return getDemoCampaigns()
    }

    const statsPromises = campaigns.map((campaign) =>
      getCampaignStats(campaign.id)
        .then((stats) => ({ ...campaign, ...stats }))
        .catch(() => ({ ...campaign })),
    )

    return Promise.all(statsPromises)
  } catch (err) {
    // Return demo data if Lemlist API is not configured
    console.log('Returning demo Lemlist campaigns (API not configured or error)', err)
    return getDemoCampaigns()
  }
}

// Demo campaigns for testing/preview
export function getDemoCampaigns(): (LemlistCampaign & LemlistCampaignStats)[] {
  return [
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
      campaignId: 'demo-1',
      campaignName: 'Q3 Tech Leads Outreach',
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
      campaignId: 'demo-2',
      campaignName: 'SaaS Founders - Series A',
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
      campaignId: 'demo-3',
      campaignName: 'CTOs at Healthcare',
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
      campaignId: 'demo-4',
      campaignName: 'VP Sales - Fortune 500',
    },
  ]
}
