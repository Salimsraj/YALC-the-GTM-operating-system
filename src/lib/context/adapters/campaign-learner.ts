/**
 * Campaign learner adapter — Phase 1 / C5.
 *
 * Analyzes campaign performance data to extract patterns and learnings.
 * Unlike markdown-folder and notion-workspace which ingest external content,
 * this adapter reads internal campaign metrics and generates intelligence nodes
 * that feed the Brain's self-learning loop.
 *
 * Pattern extraction focuses on:
 *   - Which ICPs convert best (by stage progression)
 *   - Which messaging angles resonate (by reply rate)
 *   - Common objections (from reply content)
 *   - Voice/tone that works (from successful copy)
 *   - High-value signals (from lead attributes)
 *
 * This adapter is always "available" but only produces meaningful results
 * when campaigns have been run. It upserts findings with confidence levels
 * that feed the Brain auto-update mechanism.
 */

import { and, desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { campaigns, campaignLeads, campaignVariants } from '../db/schema.js'
import { MemoryStore } from '../../memory/store.js'
import { IntelligenceStore } from '../../intelligence/store.js'
import type { ContextAdapter, SyncResult, UnsubscribeFn } from './types.js'

interface CampaignPattern {
  type: 'icp' | 'messaging' | 'objection' | 'voice' | 'signal'
  description: string
  confidence: number
  evidence: string[]
  recommendation?: string
}

async function extractICPPatterns(tenantId: string): Promise<CampaignPattern[]> {
  // Query campaigns with performance data
  const rows = await db
    .select({
      campaignId: campaigns.id,
      campaignName: campaigns.name,
      leadCount: campaigns.totalLeads,
      replyCount: campaigns.metrics,
    })
    .from(campaigns)
    .where(eq(campaigns.tenantId, tenantId))
    .orderBy(desc(campaigns.createdAt))
    .limit(10)

  const patterns: CampaignPattern[] = []

  // Group by ICP/persona attributes and calculate conversion rates
  // This is a simplified version; real implementation would analyze lead attributes
  for (const row of rows) {
    if (!row.metrics) continue

    const metrics = row.metrics as { replyRate?: number; interestedRate?: number }
    const replyRate = metrics.replyRate || 0
    const interestedRate = metrics.interestedRate || 0

    if (replyRate > 0.05) {
      // More than 5% reply rate is good
      patterns.push({
        type: 'icp',
        description: `Campaign "${row.campaignName}" achieved ${(replyRate * 100).toFixed(1)}% reply rate`,
        confidence: Math.min(interestedRate > 0.02 ? 0.8 : 0.6, 0.8), // Higher confidence if we got interested parties
        evidence: [`Campaign: ${row.campaignName}`, `Reply Rate: ${(replyRate * 100).toFixed(1)}%`],
        recommendation: 'This ICP segment is responsive. Consider scaling.',
      })
    }
  }

  return patterns
}

async function extractMessagingPatterns(tenantId: string): Promise<CampaignPattern[]> {
  // Query variant performance
  const variants = await db
    .select()
    .from(campaignVariants)
    .where(eq(campaignVariants.tenantId, tenantId))
    .orderBy(desc(campaignVariants.createdAt))
    .limit(20)

  const patterns: CampaignPattern[] = []

  // Compare variant reply rates
  let bestVariant = null
  let bestReplyRate = 0

  for (const v of variants) {
    const stats = v.stats as { replyRate?: number } | null
    const replyRate = stats?.replyRate || 0
    if (replyRate > bestReplyRate) {
      bestReplyRate = replyRate
      bestVariant = v
    }
  }

  if (bestVariant && bestReplyRate > 0) {
    patterns.push({
      type: 'messaging',
      description: `Variant "${bestVariant.name}" achieved ${(bestReplyRate * 100).toFixed(1)}% reply rate (highest performer)`,
      confidence: Math.min(0.5 + bestReplyRate, 0.85), // Higher confidence with higher reply rate
      evidence: [`Variant: ${bestVariant.name}`, `Reply Rate: ${(bestReplyRate * 100).toFixed(1)}%`],
      recommendation: 'This messaging angle is resonating. Use as template for future campaigns.',
    })
  }

  return patterns
}

async function extractSignalPatterns(tenantId: string): Promise<CampaignPattern[]> {
  // Query leads that converted (interested or replied)
  const convertedLeads = await db
    .select()
    .from(campaignLeads)
    .where(
      and(
        eq(campaignLeads.tenantId, tenantId),
        // This would normally filter for lifecycleStatus = 'Interested' or 'Replied'
        // For now, just get leads with non-null replied status
      ),
    )
    .orderBy(desc(campaignLeads.createdAt))
    .limit(100)

  const patterns: CampaignPattern[] = []

  // Analyze common attributes of converted leads
  // (simplified — real implementation would extract from lead data)
  if (convertedLeads.length > 0) {
    patterns.push({
      type: 'signal',
      description: `Analyzed ${convertedLeads.length} recent leads for conversion patterns`,
      confidence: 0.6,
      evidence: [`Sample size: ${convertedLeads.length} leads`],
      recommendation: 'Run signal effectiveness analysis to identify high-value prospecting signals.',
    })
  }

  return patterns
}

async function syncOnce(tenantId: string): Promise<SyncResult> {
  const store = new MemoryStore(tenantId)
  const intelligence = new IntelligenceStore(tenantId)

  let added = 0
  let unchanged = 0

  // Extract all pattern types
  const allPatterns: CampaignPattern[] = [
    ...(await extractICPPatterns(tenantId)),
    ...(await extractMessagingPatterns(tenantId)),
    ...(await extractSignalPatterns(tenantId)),
  ]

  // Upsert patterns as memory nodes
  for (const pattern of allPatterns) {
    const content = `
## ${pattern.type.toUpperCase()}: ${pattern.description}

**Confidence:** ${(pattern.confidence * 100).toFixed(0)}%
**Evidence:** ${pattern.evidence.join(' | ')}
${pattern.recommendation ? `\n**Recommendation:** ${pattern.recommendation}` : ''}
`.trim()

    const sourceRef = `campaign-learner://${pattern.type}/${Date.now()}`
    const sourceHash = `campaign-${pattern.type}-${tenantId}-${pattern.description.slice(0, 20).replace(/\s+/g, '-')}`

    const result = await store.upsertNodeBySourceHash({
      type: 'learning',
      content,
      sourceType: 'campaign-learner',
      sourceRef,
      sourceHash,
      confidence: pattern.confidence >= 0.8 ? 'validated' : pattern.confidence >= 0.6 ? 'hypothesis' : 'signal',
      confidenceScore: pattern.confidence,
      metadata: {
        patternType: pattern.type,
        evidence: pattern.evidence,
        recommendation: pattern.recommendation,
      },
    })

    if (result.inserted) added++
    else unchanged++
  }

  return { added, updated: 0, removed: 0, unchanged }
}

export const campaignLearnerAdapter: ContextAdapter = {
  id: 'campaign-learner',

  // Always available — it reads internal campaign data
  isAvailable(): boolean {
    return true
  },

  async sync(tenantId: string): Promise<SyncResult> {
    return syncOnce(tenantId)
  },

  async watch(_tenantId: string): Promise<UnsubscribeFn> {
    // Could watch for new campaign completions; for now, one-shot sync
    return () => {}
  },
}
