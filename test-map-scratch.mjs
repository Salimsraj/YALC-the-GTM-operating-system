import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const globalEnvPath = join(homedir(), '.gtm-os', '.env')
const localEnvPath = join(process.cwd(), '.env.local')
const envPaths = [globalEnvPath, localEnvPath].filter(existsSync)
if (envPaths.length > 0) loadEnv({ path: envPaths, quiet: true })

const FirecrawlApp = (await import('@mendable/firecrawl-js')).default
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
const result = await app.mapUrl('https://website-silk-ten-81.vercel.app/', { ignoreSitemap: true, limit: 20 })
console.log(JSON.stringify(result, null, 2))
