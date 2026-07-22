/**
 * Vercel serverless function handler — API-only Hono app.
 * On Vercel, static files are served by the platform; this handles /api/* routes only.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bearerAuth } from 'hono/bearer-auth'
import { reviewRoutes } from '../src/lib/server/routes/review.js'
import { learningRoutes } from '../src/lib/server/routes/learning.js'
import { campaignRoutes } from '../src/lib/server/routes/campaigns.js'
import { webhookRoutes } from '../src/lib/server/routes/webhooks.js'
import { frameworkRoutes } from '../src/lib/server/routes/frameworks.js'
import { setupRoutes } from '../src/lib/server/routes/setup.js'
import { todayRoutes } from '../src/lib/server/routes/today.js'
import { brainRoutes } from '../src/lib/server/routes/brain.js'
import { brainSectionRoutes } from '../src/lib/server/routes/brain-section.js'
import { secondBrainRoutes } from '../src/lib/server/routes/second-brain.js'
import { keysRoutes } from '../src/lib/server/routes/keys.js'
import { skillsRoutes } from '../src/lib/server/routes/skills.js'
import { gatesRoutes } from '../src/lib/server/routes/gates.js'
import { visualizeApiRoutes } from '../src/lib/server/routes/visualize.js'
import { dashboardRoutes } from '../src/lib/server/routes/dashboard.js'
import { orchestrateRoutes } from '../src/lib/server/routes/orchestrate.js'
import { chatRoutes } from '../src/lib/server/routes/chat.js'
import { lemlistRouter } from '../src/lib/server/routes/lemlist.js'

const app = new Hono()

// CORS for Vercel deployment — allow all origins for now (can restrict later)
app.use('*', cors({ origin: '*' }))

// Protect API routes with bearer token (optional, disabled on Vercel for now)
// const apiToken = process.env.GTM_OS_API_TOKEN
// if (apiToken) {
//   app.use('/api/*', bearerAuth({ token: apiToken }))
// }

// API routes
app.route('/api/review', reviewRoutes)
app.route('/api/learning', learningRoutes)
app.route('/api/campaigns', campaignRoutes)
app.route('/api/webhooks', webhookRoutes)
app.route('/api/setup', setupRoutes)
app.route('/api/today', todayRoutes)
app.route('/api/brain', brainRoutes)
app.route('/api/brain', brainSectionRoutes)
app.route('/api/second-brain', secondBrainRoutes)
app.route('/api/keys', keysRoutes)
app.route('/api/skills', skillsRoutes)
app.route('/api/gates', gatesRoutes)
app.route('/api/visualize', visualizeApiRoutes)
app.route('/api/dashboard', dashboardRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/lemlist', lemlistRouter())
app.route('/api', orchestrateRoutes)

// Framework routes (legacy)
app.route('/frameworks', frameworkRoutes)

// Default 404 for unmatched routes
app.all('*', (c) => c.notFound())

export default app.fetch
