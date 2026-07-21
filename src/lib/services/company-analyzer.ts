/**
 * Company Analyzer — Extract structured company information from various sources.
 *
 * Analyzes websites, documents, and data sources to extract:
 *  - Company basics (name, location, size, industry)
 *  - Team (founders, key executives, departments)
 *  - Products/Services (features, pricing, use cases)
 *  - Market (customers, competitors, positioning)
 *  - Tech Stack (infrastructure, tools, languages)
 *  - Signals (hiring, funding, recent news)
 */

import { Anthropic } from '@anthropic-ai/sdk'
import { cachedFetch } from '../cache/cached-fetch.js'

interface CompanyData {
  name: string
  website?: string
  industry?: string
  location?: string
  companySize?: string
  description?: string
  products?: string[]
  services?: string[]
  team?: {
    name: string
    role: string
    linkedin?: string
  }[]
  techStack?: string[]
  customers?: string[]
  competitors?: string[]
  signals?: {
    type: string
    description: string
    date?: string
  }[]
  pricingModel?: string
  useCases?: string[]
  metadata?: Record<string, unknown>
}

async function fetchWebsite(url: string): Promise<string> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    const response = await cachedFetch(fullUrl, {
      scope: 'company-analyzer',
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.text()
  } catch (err) {
    throw new Error(`Failed to fetch website: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export async function analyzeWebsite(url: string): Promise<CompanyData> {
  // Fetch website content
  const html = await fetchWebsite(url)

  // Extract text from HTML (simple approach - remove tags, keep content)
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000) // Limit to 5000 chars to avoid context overload

  if (!text || text.length < 100) {
    throw new Error('Website content too short or empty')
  }

  // Use Claude to extract company information
  const client = new Anthropic()
  const message = await client.messages.create({
    model: 'claude-opus-4-1-20250805',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Extract structured company information from this website content. Return valid JSON only.

Website content:
${text}

Return this JSON structure (include only fields you can extract):
{
  "name": "Company name",
  "industry": "Industry category",
  "location": "Location/headquarters",
  "companySize": "Small/Medium/Large",
  "description": "Brief description",
  "products": ["Product names"],
  "services": ["Service names"],
  "techStack": ["Tech mentioned"],
  "useCases": ["Use cases mentioned"],
  "pricingModel": "Pricing approach if visible",
  "customers": ["Customer names if mentioned"]
}`,
      },
    ],
  })

  try {
    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const extracted = JSON.parse(content.text) as CompanyData
    extracted.website = url
    return extracted
  } catch (err) {
    throw new Error(`Failed to parse company data: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export async function analyzeNotionDatabase(_databaseId: string): Promise<CompanyData> {
  // Placeholder - would implement Notion API integration
  // For now return stub
  return {
    name: 'Notion Database',
    metadata: {
      source: 'notion',
      status: 'not_yet_implemented',
    },
  }
}

export async function analyzeGoogleDrive(_folderId: string): Promise<CompanyData> {
  // Placeholder - would implement Google Drive integration
  return {
    name: 'Google Drive Folder',
    metadata: {
      source: 'google-drive',
      status: 'not_yet_implemented',
    },
  }
}

export async function analyzeCRM(_apiKey: string, _type: 'salesforce' | 'hubspot'): Promise<CompanyData> {
  // Placeholder - would implement CRM integration
  return {
    name: 'CRM Data',
    metadata: {
      source: 'crm',
      status: 'not_yet_implemented',
    },
  }
}

/**
 * Convert company data to memory nodes for interconnection
 */
export function companyDataToMemoryNodes(data: CompanyData, source: string) {
  const nodes: Array<{
    type: string
    content: string
    sourceType: string
    sourceRef: string
    metadata: Record<string, unknown>
  }> = []

  // Main company node
  nodes.push({
    type: 'document_chunk',
    content: `# ${data.name}\n\n${data.description || ''}\n\nIndustry: ${data.industry || 'N/A'}\nLocation: ${data.location || 'N/A'}`,
    sourceType: 'second-brain',
    sourceRef: `second-brain://${source}/company/${data.name}`,
    metadata: {
      company: data.name,
      type: 'company_profile',
      source,
    },
  })

  // Products/Services
  if (data.products?.length) {
    nodes.push({
      type: 'document_chunk',
      content: `Products offered by ${data.name}:\n${data.products.map((p) => `- ${p}`).join('\n')}`,
      sourceType: 'second-brain',
      sourceRef: `second-brain://${source}/products/${data.name}`,
      metadata: {
        company: data.name,
        type: 'products',
        source,
      },
    })
  }

  // Tech Stack
  if (data.techStack?.length) {
    nodes.push({
      type: 'document_chunk',
      content: `Technology stack used by ${data.name}:\n${data.techStack.map((t) => `- ${t}`).join('\n')}`,
      sourceType: 'second-brain',
      sourceRef: `second-brain://${source}/tech/${data.name}`,
      metadata: {
        company: data.name,
        type: 'tech_stack',
        source,
      },
    })
  }

  // Use Cases
  if (data.useCases?.length) {
    nodes.push({
      type: 'document_chunk',
      content: `Use cases for ${data.name}:\n${data.useCases.map((u) => `- ${u}`).join('\n')}`,
      sourceType: 'second-brain',
      sourceRef: `second-brain://${source}/usecases/${data.name}`,
      metadata: {
        company: data.name,
        type: 'use_cases',
        source,
      },
    })
  }

  return nodes
}
