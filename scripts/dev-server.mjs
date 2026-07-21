// Starts the Hono API server directly, bypassing the `start` CLI command's
// onboarding interview — useful for local dev against an already-configured
// tenant (`yalc-gtm start` always re-runs onboarding capture).
import { startServer } from '../src/lib/server/index.ts'

const port = Number.parseInt(process.argv[2] ?? '3847', 10)
startServer(port)
