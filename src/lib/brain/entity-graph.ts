/**
 * Entity Graph — Knowledge Network with Bi-directional Links
 *
 * Stores entities (Company, Person, Tech, etc.) and creates automatic backlinks.
 * When you link "Company -> uses React", we automatically create "React <- used by Company"
 */

import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { MemoryStore } from '../memory/store.js'

export type EntityType = 'company' | 'person' | 'tech' | 'product' | 'customer' | 'competitor' | 'insight'

export interface Entity {
  id: string
  type: EntityType
  name: string
  tenantId: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EntityLink {
  id: string
  fromId: string
  toId: string
  relationshipType: string // 'uses', 'works_at', 'mentions', 'competes_with', etc.
  strength?: number // 0-1, how strong is this connection
  source?: string // where this link came from (website, notion, etc.)
  tenantId: string
  createdAt: string
}

/**
 * Create or get an entity
 */
export async function upsertEntity(
  tenantId: string,
  type: EntityType,
  name: string,
  metadata?: Record<string, unknown>,
): Promise<Entity> {
  // In a real system, would query/insert from DB
  // For now, returning in-memory entity
  return {
    id: `${type}-${name.toLowerCase().replace(/\s+/g, '-')}`,
    type,
    name,
    tenantId,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Create a link and its automatic backlink
 */
export async function createEntityLink(
  tenantId: string,
  fromId: string,
  toId: string,
  relationshipType: string,
  strength: number = 0.8,
  source?: string,
): Promise<{ forward: EntityLink; backward: EntityLink }> {
  const now = new Date().toISOString()

  // Forward link
  const forwardLink: EntityLink = {
    id: `link-${fromId}-${toId}-${relationshipType}`,
    fromId,
    toId,
    relationshipType,
    strength,
    source,
    tenantId,
    createdAt: now,
  }

  // Automatic backlink (reverse relationship)
  const reverseType = getReverseRelationship(relationshipType)
  const backwardLink: EntityLink = {
    id: `link-${toId}-${fromId}-${reverseType}`,
    fromId: toId,
    toId: fromId,
    relationshipType: reverseType,
    strength,
    source,
    tenantId,
    createdAt: now,
  }

  // In real system, would save to DB
  // For now just returning

  return { forward: forwardLink, backward: backwardLink }
}

/**
 * Get reverse relationship type
 */
function getReverseRelationship(type: string): string {
  const reverses: Record<string, string> = {
    uses: 'used_by',
    used_by: 'uses',
    works_at: 'employs',
    employs: 'works_at',
    mentions: 'mentioned_by',
    mentioned_by: 'mentions',
    competes_with: 'competes_with', // symmetric
    is_customer_of: 'has_customer',
    has_customer: 'is_customer_of',
    founded_by: 'founded',
    founded: 'founded_by',
  }
  return reverses[type] || `reverse_${type}`
}

/**
 * Get all forward links from an entity
 */
export async function getForwardLinks(
  tenantId: string,
  entityId: string,
): Promise<EntityLink[]> {
  // In real system, query DB
  // For now return empty
  return []
}

/**
 * Get all backlinks to an entity (what references this entity)
 */
export async function getBacklinks(
  tenantId: string,
  entityId: string,
): Promise<EntityLink[]> {
  // In real system, query DB where toId = entityId
  // For now return empty
  return []
}

/**
 * Get entity network (forward + backward links)
 */
export async function getEntityNetwork(
  tenantId: string,
  entityId: string,
  depth: number = 2,
): Promise<{
  entity: Entity
  forwardLinks: EntityLink[]
  backlinks: EntityLink[]
  secondDegree: Entity[]
}> {
  const forwardLinks = await getForwardLinks(tenantId, entityId)
  const backlinks = await getBacklinks(tenantId, entityId)

  // Collect second-degree connections
  const connectedIds = new Set<string>()
  forwardLinks.forEach((l) => connectedIds.add(l.toId))
  backlinks.forEach((l) => connectedIds.add(l.fromId))

  // In real system would fetch these entities from DB
  const secondDegree: Entity[] = []

  return {
    entity: { id: entityId, type: 'company', name: entityId, tenantId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    forwardLinks,
    backlinks,
    secondDegree,
  }
}

/**
 * Extract entities from company data and create links
 */
export async function ingestCompanyData(
  tenantId: string,
  companyName: string,
  data: {
    techStack?: string[]
    team?: Array<{ name: string; role: string }>
    customers?: string[]
    competitors?: string[]
    products?: string[]
  },
): Promise<Entity[]> {
  const entities: Entity[] = []

  // Create company entity
  const company = await upsertEntity(tenantId, 'company', companyName, {
    source: 'website',
  })
  entities.push(company)

  // Create tech stack entities and links
  if (data.techStack) {
    for (const tech of data.techStack) {
      const techEntity = await upsertEntity(tenantId, 'tech', tech)
      entities.push(techEntity)
      await createEntityLink(tenantId, company.id, techEntity.id, 'uses', 0.9, 'website')
    }
  }

  // Create team entities and links
  if (data.team) {
    for (const member of data.team) {
      const personEntity = await upsertEntity(tenantId, 'person', member.name, {
        role: member.role,
        company: companyName,
      })
      entities.push(personEntity)
      await createEntityLink(tenantId, personEntity.id, company.id, 'works_at', 0.95, 'website')
    }
  }

  // Create customer entities and links
  if (data.customers) {
    for (const customer of data.customers) {
      const customerEntity = await upsertEntity(tenantId, 'company', customer, {
        role: 'customer',
      })
      entities.push(customerEntity)
      await createEntityLink(tenantId, customerEntity.id, company.id, 'is_customer_of', 0.8, 'website')
    }
  }

  // Create competitor entities and links
  if (data.competitors) {
    for (const competitor of data.competitors) {
      const competitorEntity = await upsertEntity(tenantId, 'company', competitor, {
        role: 'competitor',
      })
      entities.push(competitorEntity)
      await createEntityLink(tenantId, company.id, competitorEntity.id, 'competes_with', 0.7, 'website')
    }
  }

  return entities
}

/**
 * Discover patterns from entity graph
 */
export async function discoverPatterns(tenantId: string): Promise<Array<{
  name: string
  description: string
  entities: Entity[]
  insight: string
}>> {
  const patterns: Array<{
    name: string
    description: string
    entities: Entity[]
    insight: string
  }> = []

  // TODO: Implement pattern discovery
  // - Find tech stacks used by multiple companies
  // - Find people who worked at multiple target companies
  // - Find markets with consolidation patterns
  // - Find hiring surges
  // - Find funding trends

  return patterns
}
