// Starts the Hono API server directly, bypassing the `start` CLI command's
// onboarding interview — useful for local dev against an already-configured
// tenant (`yalc-gtm start` always re-runs onboarding capture).
import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

// Mirror src/cli/index.ts: ~/.gtm-os/.env (canonical) first, then .env.local
// in CWD as a fallback. Without this, provider keys (Firecrawl, etc.) never
// reach process.env when the server is started via this script directly.
const globalEnvPath = join(homedir(), '.gtm-os', '.env')
const localEnvPath = join(process.cwd(), '.env.local')
const envPaths = [globalEnvPath, localEnvPath].filter(existsSync)
if (envPaths.length > 0) {
  loadEnv({ path: envPaths, quiet: true })
}

const { startServer } = await import('../src/lib/server/index.ts')

const port = Number.parseInt(process.argv[2] ?? '3847', 10)
startServer(port)
