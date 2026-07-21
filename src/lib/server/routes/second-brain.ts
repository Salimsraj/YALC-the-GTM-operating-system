/**
 * /api/second-brain/* — Manage and analyze external data sources
 *
 * Endpoints:
 *   POST /api/second-brain/analyze     — Analyze a website/document
 *   POST /api/second-brain/connect     — Connect a data source
 *   GET  /api/second-brain/sources     — List connected sources
 *   DELETE /api/second-brain/sources/:id — Disconnect a source
 */

import { Hono } from 'hono'
import { DEFAULT_TENANT } from '../../tenant/index.js'

export const secondBrainRoutes = new Hono()

function tenantFromQuery(c: { req: { query: (k: string) => string | undefined } }): string {
  return c.req.query('tenant') ?? process.env.GTM_OS_TENANT ?? DEFAULT_TENANT
}

// ─── POST /api/second-brain/analyze ─────────────────────────────────────

secondBrainRoutes.post('/analyze', async (c) => {
  const tenant = tenantFromQuery(c)
  const body = (await c.req.json().catch(() => ({}))) as { sourceType?: string; url?: string }

  if (!body.sourceType || !body.url) {
    return c.json(
      {
        error: 'missing_params',
        message: 'sourceType and url are required',
      },
      400,
    )
  }

  try {
    const { analyzeWebsite, analyzeNotionDatabase, analyzeGoogleDrive, analyzeCRM, companyDataToMemoryNodes } =
      await import('../../services/company-analyzer.js')
    const { MemoryStore } = await import('../../memory/store.js')

    let companyData
    let source = ''

    switch (body.sourceType) {
      case 'website':
        companyData = await analyzeWebsite(body.url)
        source = `website:${body.url}`
        break
      case 'notion':
        companyData = await analyzeNotionDatabase(body.url)
        source = `notion:${body.url}`
        break
      case 'google-drive':
        companyData = await analyzeGoogleDrive(body.url)
        source = `google-drive:${body.url}`
        break
      case 'crm':
        companyData = await analyzeCRM(body.url, 'salesforce')
        source = `crm:${body.url}`
        break
      default:
        return c.json(
          {
            error: 'unknown_source_type',
            message: `Unknown source type: ${body.sourceType}`,
          },
          400,
        )
    }

    // Convert to memory nodes
    const nodes = companyDataToMemoryNodes(companyData, source)

    // Ingest into memory
    const store = new MemoryStore(tenant)
    let ingested = 0
    for (const node of nodes) {
      const result = await store.upsertNodeBySourceHash({
        type: node.type as any,
        content: node.content,
        sourceType: node.sourceType,
        sourceRef: node.sourceRef,
        sourceHash: `second-brain-${source}-${node.metadata.type}`,
        metadata: node.metadata,
        confidence: 'validated',
        confidenceScore: 0.8,
      })
      if (result.inserted) ingested++
    }

    return c.json({
      ok: true,
      tenant,
      source,
      companyData,
      nodesCreated: nodes.length,
      nodesIngested: ingested,
    })
  } catch (err) {
    return c.json(
      {
        error: 'analysis_failed',
        message: err instanceof Error ? err.message : 'Analysis failed',
      },
      400,
    )
  }
})

// ─── POST /api/second-brain/connect ─────────────────────────────────────

secondBrainRoutes.post('/connect', async (c) => {
  const tenant = tenantFromQuery(c)
  const body = (await c.req.json().catch(() => ({}))) as { sourceType?: string; url?: string; name?: string }

  // For now, just acknowledge and trigger analysis
  try {
    const response = await c.req.raw.url.startsWith('http')
      ? fetch(new URL('/api/second-brain/analyze', c.req.raw.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      : null

    if (response) {
      const result = await response.json()
      return c.json({
        ok: true,
        tenant,
        ...result,
      })
    }

    return c.json({
      ok: true,
      tenant,
      message: 'Connection initiated',
    })
  } catch (err) {
    return c.json(
      {
        error: 'connection_failed',
        message: err instanceof Error ? err.message : 'Connection failed',
      },
      400,
    )
  }
})

// ─── GET /api/second-brain/sources ──────────────────────────────────────

secondBrainRoutes.get('/sources', async (c) => {
  const tenant = tenantFromQuery(c)

  // TODO: Query memory store for all second-brain sources
  // For now return mock data
  return c.json({
    ok: true,
    tenant,
    sources: [
      {
        id: '1',
        type: 'website',
        url: 'example.com',
        name: 'Company Website',
        status: 'synced',
        itemsIngested: 45,
        relationships: 12,
        lastSync: new Date().toISOString(),
      },
    ],
  })
})

// ─── DELETE /api/second-brain/sources/:id ────────────────────────────────

secondBrainRoutes.delete('/sources/:id', async (c) => {
  const tenant = tenantFromQuery(c)
  const id = c.req.param('id')

  // TODO: Remove all memory nodes associated with this source
  return c.json({
    ok: true,
    tenant,
    message: `Source ${id} removed`,
  })
})
