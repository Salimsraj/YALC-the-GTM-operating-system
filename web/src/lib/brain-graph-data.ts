/**
 * Turns the real /api/brain/context response (the tenant's live company
 * context, ICP, framework, voice, etc.) into ObsidianGraph nodes/edges —
 * hub → section → field, using each section's actual YAML/markdown
 * content rather than placeholder data.
 */
import yaml from 'js-yaml'
import type { GraphEdge, GraphNode } from '@/components/ObsidianGraph'

export interface BrainSectionFile {
  canonical: string
  abs: string
  content: string
  format: 'yaml' | 'markdown' | 'text'
}

export interface BrainSection {
  id: string
  files: BrainSectionFile[]
  confidence: number | null
}

export interface BrainContextResponse {
  tenant: string
  sections: BrainSection[]
}

function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function truncate(s: string, max = 38): string {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** Flatten a parsed YAML value into leaf labels, skipping empty fields. Caps depth to keep the graph readable. */
function yamlLeaves(value: unknown, keyPath: string, depth: number, out: string[]) {
  if (value === null || value === undefined || value === '') return
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.push(`${humanize(keyPath)}: ${truncate(String(value))}`)
    return
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return
    const allScalar = value.every((v) => typeof v === 'string' || typeof v === 'number')
    if (allScalar) {
      out.push(`${humanize(keyPath)}: ${truncate(value.join(', '))}`)
    } else {
      out.push(`${humanize(keyPath)} (${value.length})`)
    }
    return
  }
  if (typeof value === 'object') {
    if (depth <= 0) {
      const nonEmpty = Object.values(value as object).some((v) => v !== '' && v !== null && v !== undefined)
      if (nonEmpty) out.push(humanize(keyPath))
      return
    }
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      yamlLeaves(v, keyPath ? `${keyPath}.${k}` : k, depth - 1, out)
    }
  }
}

function fileLeaves(file: BrainSectionFile): string[] {
  if (file.format === 'yaml') {
    try {
      // Some section files wrap their content in a stray ```yaml fence —
      // strip it before parsing rather than falling through to noisy
      // line-based extraction.
      const unfenced = file.content.replace(/^```ya?ml\s*\n?/i, '').replace(/```\s*$/, '')
      const parsed = yaml.load(unfenced)
      if (parsed && typeof parsed === 'object') {
        const out: string[] = []
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          yamlLeaves(v, k, 1, out)
        }
        if (out.length > 0) return out
      }
    } catch {
      // Falls through to line-based extraction below (e.g. YAML files with
      // an embedded ```yaml fence, which js-yaml can't parse as-is).
    }
  }
  return file.content
    .split('\n')
    .map((l) => l.replace(/^[#*\-`\s]+/, '').trim())
    .filter((l) => l.length > 3 && l.length < 120)
    .slice(0, 8)
    .map((l) => truncate(l))
}

export function buildBrainGraph(res: BrainContextResponse): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [{ id: 'hub', label: res.tenant ? `${res.tenant} Brain` : 'Brain' }]
  const edges: GraphEdge[] = []
  let leafCount = 0

  for (const section of res.sections) {
    const sectionId = `section-${section.id}`
    const leaves = section.files.flatMap(fileLeaves)
    if (leaves.length === 0) continue

    nodes.push({ id: sectionId, label: humanize(section.id) })
    edges.push({ source: 'hub', target: sectionId })

    const seen = new Set<string>()
    for (const label of leaves) {
      if (seen.has(label)) continue
      seen.add(label)
      const id = `leaf-${leafCount++}`
      nodes.push({ id, label })
      edges.push({ source: sectionId, target: id })
    }
  }

  return { nodes, edges }
}
