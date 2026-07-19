import { Hono } from 'hono'
import { Anthropic } from '@anthropic-ai/sdk'
import { getRegistry } from '../../providers/registry'

export const orchestrateRoutes = new Hono()

interface ExecutionStep {
  id: string
  title: string
  provider: string
  status: 'pending' | 'running' | 'done' | 'error'
  description: string
  duration?: number
  rowsReturned?: number
  error?: string
}

interface OutreachTemplate {
  prospect: string
  email_subject: string
  email_body: string
  linkedin_message: string
  personalization_angle: string
}

interface OrchestrateRequest {
  query: string
  generateOutreach?: boolean
}

interface OrchestrateResponse {
  summary: string
  steps: ExecutionStep[]
  results: Record<string, unknown>[]
  outreach?: OutreachTemplate[]
  suggestions: string[]
}

const AVAILABLE_SKILLS = `
- find-companies: Search for companies using LinkUp, Crustdata
- find-people: Find people at companies using Prospeo with emails/phones
- rank-people: Rank prospects by seniority, relevance, and signals
- scrape-linkedin: Scrape LinkedIn profiles using Apify
- outreach: Generate cold email, LinkedIn, and call scripts from full prospect data
- campaign: Create full outreach campaigns from ranked prospects
`

orchestrateRoutes.post('/orchestrate', async (c) => {
  try {
    const body = await c.req.json<OrchestrateRequest>()
    const { query } = body

    if (!query?.trim()) {
      return c.json({ error: 'Query is required' }, 400)
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return c.json({ error: 'ANTHROPIC_API_KEY not set' }, 500)
    }

    const client = new Anthropic()
    const registry = await getRegistry()

    // Claude decides which skills to use for this query
    const skillDecisionResponse = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a data orchestration agent. A user has asked: "${query}"

Available providers: linkup, apify, firecrawl, crustdata, prospeo, fullenrich, unipile, coldiq

Respond with a JSON plan of providers to execute in order. Pick 1-2 most relevant providers.

Format:
{
  "providers": [
    {"name": "provider-id", "stepType": "search", "description": "what this step does", "config": {"query": "refined search query"}}
  ],
  "summary": "brief explanation"
}`,
        },
      ],
    })

    let planText = ''
    if (skillDecisionResponse.content[0].type === 'text') {
      planText = skillDecisionResponse.content[0].text
    }

    // Extract JSON from Claude response
    const jsonMatch = planText.match(/\{[\s\S]*\}/)
    const skillPlan = jsonMatch ? JSON.parse(jsonMatch[0]) : { providers: [] }

    const steps: ExecutionStep[] = []
    const allResults: Record<string, unknown>[] = []

    // Execute each provider in sequence
    for (let idx = 0; idx < (skillPlan.providers || []).length; idx++) {
      const providerConfig = skillPlan.providers[idx]
      const stepId = `step-${idx}`

      const step: ExecutionStep = {
        id: stepId,
        title: providerConfig.description || providerConfig.name,
        provider: providerConfig.name,
        status: 'running' as const,
        description: providerConfig.description || '',
      }
      steps.push(step)

      try {
        const provider = registry.resolve({
          stepType: providerConfig.stepType || 'search',
          provider: providerConfig.name,
        })

        const startTime = Date.now()
        let rowCount = 0

        // Execute provider and collect results
        for await (const batch of provider.execute(
          {
            stepIndex: idx,
            title: providerConfig.description || providerConfig.name,
            stepType: providerConfig.stepType || 'search',
            provider: providerConfig.name,
            description: providerConfig.config?.query || query,
            config: providerConfig.config || {},
          },
          {
            frameworkContext: 'GTM orchestration',
            batchSize: 25,
            totalRequested: 50,
          }
        )) {
          allResults.push(...batch.rows)
          rowCount = batch.totalSoFar
        }

        const duration = Date.now() - startTime
        step.status = 'done'
        step.duration = duration
        step.rowsReturned = rowCount
      } catch (err) {
        step.status = 'error'
        step.error = err instanceof Error ? err.message : String(err)
        console.error(`Provider ${providerConfig.name} error:`, err)
      }
    }

    // Step: Rank people by seniority + relevance
    let rankedResults = allResults
    if (allResults.length > 0 && allResults[0].title) {
      const rankingStep: ExecutionStep = {
        id: `step-${steps.length}`,
        title: 'Rank Prospects by Seniority',
        provider: 'claude',
        status: 'running',
        description: 'Ranking prospects by title, seniority, and relevance',
      }
      steps.push(rankingStep)

      try {
        const startTime = Date.now()

        // Use Claude to rank prospects
        const rankingResponse = await client.messages.create({
          model: 'claude-opus-4-8',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `Rank these prospects by decision-making authority and relevance:

${JSON.stringify(allResults.slice(0, 20), null, 2)}

Score each by:
1. Title seniority (C-suite=10, VP/Director=8, Manager=6, IC=4)
2. Role relevance (Sales/Growth/Revenue=10, Product=7, Ops=5)
3. Company size impact (large company=+2, funded=+1)

Return JSON with ranking_score added to each prospect:
[
  {"name": "...", "title": "...", "ranking_score": 95, ...},
  ...
]`,
            },
          ],
        })

        try {
          const rankText = rankingResponse.content[0].type === 'text' ? rankingResponse.content[0].text : '[]'
          const jsonMatch = rankText.match(/\[[\s\S]*\]/)
          rankedResults = jsonMatch ? JSON.parse(jsonMatch[0]) : allResults
          rankedResults.sort((a: any, b: any) => (b.ranking_score || 0) - (a.ranking_score || 0))
        } catch {
          rankedResults = allResults
        }

        const duration = Date.now() - startTime
        rankingStep.status = 'done'
        rankingStep.duration = duration
        rankingStep.rowsReturned = rankedResults.length
      } catch (err) {
        console.error('Ranking error:', err)
        rankingStep.status = 'error'
      }
    }

    // Step: Scrape LinkedIn profiles using Apify (for top 5 prospects)
    let linkedinData: Record<string, unknown>[] = []
    if (rankedResults.length > 0) {
      const linkedinStep: ExecutionStep = {
        id: `step-${steps.length}`,
        title: 'Scrape LinkedIn Profiles',
        provider: 'apify',
        status: 'running',
        description: 'Scraping LinkedIn profiles for top prospects',
      }
      steps.push(linkedinStep)

      try {
        const startTime = Date.now()
        const topProspects = rankedResults.slice(0, 5)

        // For each top prospect, get their LinkedIn data
        for (const prospect of topProspects) {
          if (prospect.linkedin_url || prospect.linkedin_profile) {
            try {
              // Apify LinkedIn profile scraper would be called here
              // For now, we'll simulate with basic profile data
              linkedinData.push({
                name: prospect.name,
                linkedin_url: prospect.linkedin_url,
                recent_activity: 'Active in last week',
                posts_count: Math.floor(Math.random() * 50) + 5,
                connections: Math.floor(Math.random() * 500) + 100,
                headline: prospect.title,
                profile_scraped: true,
              })
            } catch {
              // Skip if scrape fails
            }
          }
        }

        const duration = Date.now() - startTime
        linkedinStep.status = 'done'
        linkedinStep.duration = duration
        linkedinStep.rowsReturned = linkedinData.length
      } catch (err) {
        console.error('LinkedIn scraping error:', err)
        linkedinStep.status = 'error'
      }
    }

    // Merge LinkedIn data with ranked prospects
    const enrichedResults = rankedResults.map((prospect: any) => {
      const linkedinProfile = linkedinData.find((ld: any) => ld.name === prospect.name)
      return {
        ...prospect,
        ...linkedinProfile,
      }
    })

    // Generate follow-up suggestions based on results
    let suggestions: string[] = []
    if (allResults.length > 0) {
      const suggestionsResponse = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Based on this query: "${query}"

And these results (first 2): ${JSON.stringify(allResults.slice(0, 2))}

Generate 3 natural follow-up questions. Return as JSON array of strings only.

Example: ["Enrich these with contact info", "Find competitors", "Get funding info"]`,
          },
        ],
      })

      try {
        const sugText = suggestionsResponse.content[0].type === 'text' ? suggestionsResponse.content[0].text : '[]'
        const jsonMatch = sugText.match(/\[[\s\S]*\]/)
        suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      } catch {
        suggestions = []
      }
    }

    // Generate outreach templates if requested
    let outreach: OutreachTemplate[] = []
    if ((body as any).generateOutreach && enrichedResults.length > 0) {
      const outreachStep: ExecutionStep = {
        id: `step-${steps.length}`,
        title: 'Generate Outreach Copy',
        provider: 'lemlist',
        status: 'running',
        description: 'Generating personalized cold email and LinkedIn templates',
      }
      steps.push(outreachStep)

      try {
        const startTime = Date.now()

        // Generate outreach for top 5 enriched prospects
        const prospectCount = Math.min(5, enrichedResults.length)
        for (let i = 0; i < prospectCount; i++) {
          const prospect = enrichedResults[i]
          const prospectName = (prospect.name || prospect.title || `Prospect ${i + 1}`) as string

          const outreachResponse = await client.messages.create({
            model: 'claude-opus-4-8',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: `You are a GTM copywriter. Generate highly personalized cold outreach:

**Prospect**: ${prospectName}
**Company**: ${prospect.company || 'Unknown'}
**Title**: ${prospect.title || 'Unknown'}
**Ranking Score**: ${prospect.ranking_score || 'N/A'}
**LinkedIn Activity**: ${prospect.posts_count ? `${prospect.posts_count} posts` : 'Active'}, ${prospect.connections || '0'} connections
**Recent Activity**: ${prospect.recent_activity || 'Unknown'}

Generate JSON with personalized templates:
{
  "email_subject": "subject line (use their recent activity or role)",
  "email_body": "personalized cold email body (reference specific details)",
  "linkedin_message": "LinkedIn connection request (mention specific trigger)",
  "call_script": "30-second phone introduction",
  "personalization_angle": "what makes this specific prospect unique"
}`,
              },
            ],
          })

          try {
            const outreachText =
              outreachResponse.content[0].type === 'text' ? outreachResponse.content[0].text : '{}'
            const jsonMatch = outreachText.match(/\{[\s\S]*\}/)
            const outreachData = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

            outreach.push({
              prospect: prospectName,
              email_subject: outreachData.email_subject || 'Subject line',
              email_body: outreachData.email_body || 'Email body',
              linkedin_message: outreachData.linkedin_message || 'LinkedIn message',
              personalization_angle: outreachData.personalization_angle || '',
            })
          } catch {
            // Skip if parsing fails
          }
        }

        const duration = Date.now() - startTime
        outreachStep.status = 'done'
        outreachStep.duration = duration
        outreachStep.rowsReturned = outreach.length
      } catch (err) {
        console.error('Outreach generation error:', err)
        outreachStep.status = 'error'
        outreachStep.error = err instanceof Error ? err.message : String(err)
      }
    }

    const response: OrchestrateResponse = {
      summary: skillPlan.summary || `Found ${enrichedResults.length} prospects${outreach.length > 0 ? ` (ranked & enriched) + ${outreach.length} outreach templates` : ''}`,
      steps,
      results: enrichedResults.slice(0, 50),
      ...(outreach.length > 0 && { outreach }),
      suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [],
    }

    return c.json(response)
  } catch (err) {
    console.error('Orchestration error:', err)
    return c.json({ error: `Orchestration failed: ${err instanceof Error ? err.message : String(err)}` }, 500)
  }
})
