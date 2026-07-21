import type Anthropic from '@anthropic-ai/sdk'
import type { SkillMetadata } from '../skills/types'

/**
 * Skills that send/publish something externally (email, LinkedIn DM,
 * multi-channel campaign, comment reply, campaign tracker advance). The
 * chat route requires an explicit user confirm before executing any of
 * these — see src/lib/server/routes/chat.ts. Every other skill runs
 * immediately when picked.
 */
export const MUTATING_SKILL_IDS = new Set([
  'send-email-sequence',
  'orchestrate',
  'multi-channel-campaign',
  'answer-comments',
  'track-campaign',
])

/**
 * Builds one Anthropic tool per registered skill, using the skill's own
 * inputSchema as the tool's input_schema (already JSON-Schema shaped).
 */
export function buildSkillTools(skills: SkillMetadata[]): Anthropic.Tool[] {
  return skills.map((s) => ({
    name: toolNameForSkill(s.id),
    description: `${s.description} [category: ${s.category}]`,
    input_schema: s.inputSchema as Anthropic.Tool['input_schema'],
  }))
}

/** Anthropic tool names must match ^[a-zA-Z0-9_-]{1,128}$ — skill ids already do, but normalize defensively. */
export function toolNameForSkill(skillId: string): string {
  return skillId.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function skillIdForToolName(toolName: string, skills: SkillMetadata[]): string | null {
  const match = skills.find((s) => toolNameForSkill(s.id) === toolName)
  return match?.id ?? null
}

export function buildChatSystemPrompt(): string {
  return `You are YALC's GTM assistant, embedded in a chat UI. The user asks for B2B data or GTM actions in plain English.

Rules:
- If the request maps to one of your tools, call exactly ONE tool with parameters extracted from the user's message. Be specific — don't leave fields empty if the user gave you the info.
- If the request is a general question, greeting, or doesn't match any tool, answer conversationally in plain text — do not force a tool call.
- Never call more than one tool per turn.`
}
