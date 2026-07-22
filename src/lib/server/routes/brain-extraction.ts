/**
 * Brain Data Extraction Routes
 * POST /api/brain/extract/:source — extract entities from a data source
 */

import { Hono } from 'hono'
import {
  extractFromNotion,
  extractFromHubSpot,
  extractFromSalesforce,
  extractFromFireflies,
  extractFromGoogleDrive,
  extractFromWebsite,
  extractEntitiesFromText,
} from '../../brain/data-extractors.js'

export const brainExtractionRoutes = new Hono()

/**
 * Extract from Notion
 * POST /api/brain/extract/notion
 */
brainExtractionRoutes.post('/notion', async (c) => {
  try {
    const body = await c.req.json()
    const { apiKey, databaseId } = body

    if (!apiKey || !databaseId) {
      return c.json(
        { error: 'Missing required fields: apiKey, databaseId' },
        400,
      )
    }

    const nodes = await extractFromNotion({ apiKey, databaseId })

    return c.json({
      source: 'notion',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Notion extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract from HubSpot
 * POST /api/brain/extract/hubspot
 */
brainExtractionRoutes.post('/hubspot', async (c) => {
  try {
    const body = await c.req.json()
    const { apiKey } = body

    if (!apiKey) {
      return c.json({ error: 'Missing required field: apiKey' }, 400)
    }

    const nodes = await extractFromHubSpot({ apiKey })

    return c.json({
      source: 'hubspot',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('HubSpot extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract from Salesforce
 * POST /api/brain/extract/salesforce
 */
brainExtractionRoutes.post('/salesforce', async (c) => {
  try {
    const body = await c.req.json()
    const { orgUrl, clientId } = body

    if (!orgUrl || !clientId) {
      return c.json(
        { error: 'Missing required fields: orgUrl, clientId' },
        400,
      )
    }

    const nodes = await extractFromSalesforce({ orgUrl, clientId })

    return c.json({
      source: 'salesforce',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Salesforce extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract from Fireflies
 * POST /api/brain/extract/fireflies
 */
brainExtractionRoutes.post('/fireflies', async (c) => {
  try {
    const body = await c.req.json()
    const { apiKey } = body

    if (!apiKey) {
      return c.json({ error: 'Missing required field: apiKey' }, 400)
    }

    const nodes = await extractFromFireflies({ apiKey })

    return c.json({
      source: 'fireflies',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Fireflies extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract from Google Drive
 * POST /api/brain/extract/google-drive
 */
brainExtractionRoutes.post('/google-drive', async (c) => {
  try {
    const nodes = await extractFromGoogleDrive()

    return c.json({
      source: 'google-drive',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Google Drive extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract from Website
 * POST /api/brain/extract/website
 */
brainExtractionRoutes.post('/website', async (c) => {
  try {
    const body = await c.req.json()
    const { url } = body

    if (!url) {
      return c.json({ error: 'Missing required field: url' }, 400)
    }

    const nodes = await extractFromWebsite({ url })

    return c.json({
      source: 'website',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Website extraction error:', errorMsg, error)
    return c.json(
      {
        error: errorMsg || 'Extraction failed with unknown error',
        details: String(error),
      },
      500,
    )
  }
})

/**
 * Extract from Obsidian Vault
 * POST /api/brain/extract/obsidian
 */
brainExtractionRoutes.post('/obsidian', async (c) => {
  try {
    const body = await c.req.json()
    const { vaultPath } = body

    const { extractFromObsidian } = await import('../../brain/data-extractors.js')
    const nodes = await extractFromObsidian({ vaultPath })

    return c.json({
      source: 'obsidian',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Obsidian extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})

/**
 * Extract entities from text (transcripts, notes, etc.)
 * POST /api/brain/extract/text
 * Body: { text: string, context?: string }
 */
brainExtractionRoutes.post('/text', async (c) => {
  try {
    const body = await c.req.json()
    const { text, context } = body

    if (!text) {
      return c.json({ error: 'Missing required field: text' }, 400)
    }

    const nodes = await extractEntitiesFromText(text, context)

    return c.json({
      source: 'text-extraction',
      itemsExtracted: nodes.length,
      nodes,
    })
  } catch (error) {
    console.error('Text extraction error:', error)
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Extraction failed',
      },
      500,
    )
  }
})
