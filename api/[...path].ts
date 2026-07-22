/**
 * Vercel serverless function handler.
 *
 * This app is designed local-first (CLI + `~/.gtm-os/` filesystem config +
 * local SQLite DB) — most routes in src/lib/server/routes/ assume that
 * environment and can't run statelessly on Vercel. The Brain extraction
 * endpoints are the exception: they only call Firecrawl + Anthropic and
 * touch no local filesystem/DB, so they're safe to expose here.
 *
 * IMPORTANT: keep this file's import list minimal. A single broken/
 * filesystem-dependent transitive import in a statically-imported route
 * module crashes the ENTIRE function (ESM resolves all static imports
 * eagerly) — including routes that would otherwise work fine.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { brainExtractionRoutes } from '../src/lib/server/routes/brain-extraction.js'

const app = new Hono()

app.use('*', cors({ origin: '*' }))

app.route('/api/brain/extract', brainExtractionRoutes)

app.all('/api/*', (c) =>
  c.json(
    {
      error: 'not_available_on_hosted_deployment',
      message:
        'This endpoint depends on local filesystem/CLI state and only runs via `yalc-gtm start` locally.',
    },
    501,
  ),
)

app.all('*', (c) => c.notFound())

// Vercel's Node.js function runtime expects a Web Fetch-style handler via a
// named export (not a default export) — see the `hono/vercel` adapter note
// that this signature works for GET/POST/etc uniformly through one export.
export const GET = app.fetch
export const POST = app.fetch
export const PUT = app.fetch
export const DELETE = app.fetch
export const PATCH = app.fetch
export const OPTIONS = app.fetch
