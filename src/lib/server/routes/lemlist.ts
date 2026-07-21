import { Hono } from 'hono'
import { getCampaignsWithStats } from '../../services/lemlist'

export function lemlistRouter() {
  const router = new Hono()

  router.get('/campaigns', async (c) => {
    try {
      const campaigns = await getCampaignsWithStats()
      return c.json({ campaigns })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return c.json({ error: message }, 500)
    }
  })

  return router
}
