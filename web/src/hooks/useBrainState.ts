import { useState, useCallback } from 'react'
import { Anthropic } from '@anthropic-ai/sdk'

export interface GraphNode {
  id: string
  name: string
  type: 'company' | 'person' | 'deal' | 'objection' | 'value_prop' | 'note' | 'meeting' | 'source' | 'hub'
  color?: string
  size?: number
  metadata?: Record<string, unknown>
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphLink {
  source: string
  target: string
  type?: string
}

export interface ExtractedNode {
  type: 'company' | 'person' | 'deal' | 'objection' | 'value_prop' | 'meeting' | 'note'
  name: string
  content: string
  metadata?: Record<string, unknown>
  relationships?: Array<{
    target: string
    type: string
  }>
}

const NODE_COLORS: Record<string, string> = {
  company: '#FF6B6B',
  person: '#9B59B6',
  deal: '#3498DB',
  objection: '#F39C12',
  value_prop: '#27AE60',
  meeting: '#E74C3C',
  note: '#95A5A6',
  source: '#34495E',
  hub: '#8B7355',
}

const NODE_SIZES: Record<string, number> = {
  company: 35,
  person: 28,
  deal: 25,
  objection: 22,
  value_prop: 25,
  meeting: 20,
  note: 18,
  source: 30,
  hub: 50,
}

export function useBrainState() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [mergeInProgress, setMergeInProgress] = useState(false)

  // Transform extracted nodes to graph nodes
  const transformExtractedNodes = useCallback((extracted: ExtractedNode[]): { nodes: GraphNode[]; links: GraphLink[] } => {
    const newNodes: GraphNode[] = []
    const newLinks: GraphLink[] = []
    const nameToId = new Map<string, string>()

    // Create nodes from extracted data
    extracted.forEach((node) => {
      const id = `${node.type}-${node.name.toLowerCase().replace(/\s+/g, '-')}`
      const graphNode: GraphNode = {
        id,
        name: node.name,
        type: node.type,
        color: NODE_COLORS[node.type] || '#95A5A6',
        size: NODE_SIZES[node.type] || 20,
        metadata: {
          content: node.content,
          source: node.metadata?.source,
          ...node.metadata,
        },
      }
      newNodes.push(graphNode)
      nameToId.set(node.name.toLowerCase(), id)
    })

    // Create links from relationships — resolve target by name, not by
    // guessing a type prefix (relationship.target is a name, not a type).
    extracted.forEach((node) => {
      const sourceId = nameToId.get(node.name.toLowerCase())!
      if (node.relationships) {
        node.relationships.forEach((rel) => {
          const targetId = nameToId.get(rel.target.toLowerCase())
          if (targetId) {
            newLinks.push({
              source: sourceId,
              target: targetId,
              type: rel.type,
            })
          }
        })
      }
    })

    return { nodes: newNodes, links: newLinks }
  }, [])

  // Merge new nodes with existing ones, resolving duplicates via Claude
  const mergeNodes = useCallback(
    async (newExtracted: ExtractedNode[]) => {
      setMergeInProgress(true)
      try {
        const { nodes: newNodes, links: newLinks } = transformExtractedNodes(newExtracted)

        // If no existing nodes, just add the new ones
        if (nodes.length === 0) {
          setNodes(newNodes)
          setLinks(newLinks)
          return
        }

        // Find potential duplicates by name similarity
        const client = new Anthropic()
        const existingNodesList = nodes.map((n) => ({ id: n.id, name: n.name, type: n.type }))
        const newNodesList = newNodes.map((n) => ({ id: n.id, name: n.name, type: n.type }))

        const response = await client.messages.create({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Analyze these two lists of nodes and identify which ones are duplicates (same entity, different name variations).

Existing nodes:
${JSON.stringify(existingNodesList, null, 2)}

New nodes to add:
${JSON.stringify(newNodesList, null, 2)}

Return a JSON object with:
- "duplicates": array of { existingId, newId, reason } for confirmed duplicates
- "new": array of newIds that are genuinely new
- "uncertain": array of potential duplicates to review manually

Example:
{
  "duplicates": [
    { "existingId": "company-acme-corp", "newId": "company-acme-inc", "reason": "Same company, different name variation" }
  ],
  "new": ["company-new-startup"],
  "uncertain": []
}`,
            },
          ],
        })

        const content = response.content[0]
        if (content.type !== 'text') throw new Error('Unexpected response type')

        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON found in response')

        const mergeResult = JSON.parse(jsonMatch[0])

        // Build merged node list
        const mergedNodes = [...nodes]
        const mergedLinks = [...links]
        const processedNewIds = new Set<string>()

        // Handle duplicates - merge metadata
        mergeResult.duplicates?.forEach((dup: { existingId: string; newId: string }) => {
          const existingNode = mergedNodes.find((n) => n.id === dup.existingId)
          const newNode = newNodes.find((n) => n.id === dup.newId)
          if (existingNode && newNode) {
            // Merge metadata
            existingNode.metadata = {
              ...existingNode.metadata,
              ...newNode.metadata,
              mergedFrom: [existingNode.metadata?.mergedFrom || [], dup.newId].flat(),
            }
          }
          processedNewIds.add(dup.newId)
        })

        // Add genuinely new nodes
        mergeResult.new?.forEach((newId: string) => {
          const newNode = newNodes.find((n) => n.id === newId)
          if (newNode) {
            mergedNodes.push(newNode)
          }
          processedNewIds.add(newId)
        })

        // Add uncertain duplicates as new (user can manually resolve)
        mergeResult.uncertain?.forEach((uncId: string) => {
          const uncNode = newNodes.find((n) => n.id === uncId)
          if (uncNode) {
            uncNode.metadata = { ...uncNode.metadata, uncertain: true }
            mergedNodes.push(uncNode)
          }
          processedNewIds.add(uncId)
        })

        // Add links for the new/merged nodes
        newLinks.forEach((link) => {
          if (processedNewIds.has(link.source) || processedNewIds.has(link.target)) {
            // Only add links if at least one end is a new/processed node
            if (!mergedLinks.find((l) => l.source === link.source && l.target === link.target)) {
              mergedLinks.push(link)
            }
          }
        })

        setNodes(mergedNodes)
        setLinks(mergedLinks)
      } catch (error) {
        console.error('Merge failed:', error)
        // Fallback: just add new nodes without merging
        const { nodes: newNodes, links: newLinks } = transformExtractedNodes(newExtracted)
        setNodes([...nodes, ...newNodes])
        setLinks([...links, ...newLinks])
      } finally {
        setMergeInProgress(false)
      }
    },
    [nodes, transformExtractedNodes]
  )

  // Add extracted nodes (triggers merge)
  const addExtractedNodes = useCallback(
    async (extracted: ExtractedNode[]) => {
      await mergeNodes(extracted)
    },
    [mergeNodes]
  )

  // Clear brain
  const clearBrain = useCallback(() => {
    setNodes([])
    setLinks([])
  }, [])

  return {
    nodes,
    links,
    addExtractedNodes,
    clearBrain,
    mergeInProgress,
    setNodes,
    setLinks,
  }
}
