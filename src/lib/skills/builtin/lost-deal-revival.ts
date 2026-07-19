import type { Skill, SkillContext, SkillEvent } from '../types'

type OutputMode = 'crm_task' | 'lemlist_draft'

interface RevivalConfig {
  version: number
  output_mode: OutputMode
  task_due_offset_hours: number
}

interface PairSignal {
  signalType: string
  signalId: string
  payload?: Record<string, unknown>
  lastSeenAt?: string
}

interface RevivalInput {
  watchId: string
  companyId: string
  entityName: string
  signalTypes: string[]
  signals?: PairSignal[]
  firedAt: string
  __configOverride?: Partial<RevivalConfig>
  __mapOverride?: Record<string, string[]>
  __claapFetcher?: (entityName: string, companyId: string) => Promise<string | null>
  __anthropicDraft?: (args: {
    entityName: string
    objectionQuote: string
    objectionKind: string
    signalKind: string
    signals: PairSignal[]
  }) => Promise<{ line1: string; line2: string }>
  __hubspotTask?: (args: { subject: string; body: string; dueAt: string; ownerId?: string }) => Promise<{ taskId: string }>
  __lemlistDraft?: (args: { name: string; body: string }) => Promise<{ campaignId: string }>
  __slackSend?: (args: { text: string; target: string }) => Promise<void>
}

const DEFAULT_CONFIG: RevivalConfig = {
  version: 1,
  output_mode: 'crm_task',
  task_due_offset_hours: 24,
}

const DEFAULT_MAP: Record<string, string[]> = {
  headcount: ['hiring_surge'],
  pricing: ['funding_round'],
  timing: ['quarter_start'],
  integration: ['tech_stack_change'],
  competitor: ['competitor_customer_churn'],
}

function extractKinds(signalTypes: string[]): { objectionKind: string | null; signalKind: string | null } {
  let objectionKind: string | null = null
  let signalKind: string | null = null
  for (const raw of signalTypes) {
    if (raw.startsWith('objection:')) {
      objectionKind = raw.slice('objection:'.length) || null
      continue
    }
    if (raw.startsWith('signal:')) {
      signalKind = raw.slice('signal:'.length) || null
      continue
    }
  }
  return { objectionKind, signalKind }
}

function hasDisallowedDash(text: string): boolean {
  return /[\u2013\u2014]/.test(text)
}

function defaultDraft(entityName: string, quote: string, signalKind: string): { line1: string; line2: string } {
  return {
    line1: `Hi ${entityName}, last time you told us "${quote}" and that constraint may have changed (${signalKind}).`,
    line2: 'Want me to resend the short plan adjusted to this update?',
  }
}

export const lostDealRevivalSkill: Skill = {
  id: 'lost-deal-revival-agent',
  name: 'Lost Deal Revival Agent',
  version: '1.0.0',
  description: 'Drafts a revival message when a fresh signal contradicts a prior closed-lost objection.',
  category: 'outreach',
  inputSchema: {
    type: 'object',
    properties: {
      watchId: { type: 'string' },
      companyId: { type: 'string' },
      entityName: { type: 'string' },
      signalTypes: { type: 'array', items: { type: 'string' } },
      firedAt: { type: 'string' },
    },
    required: ['watchId', 'companyId', 'entityName', 'signalTypes', 'firedAt'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      objection_kind: { type: 'string' },
      signal_kind: { type: 'string' },
      draft: { type: 'object' },
      taskId: { type: 'string' },
      campaignId: { type: 'string' },
      output_mode: { type: 'string' },
    },
  },
  requiredCapabilities: ['crm-create-task', 'slack-send-message'],

  async *execute(input: unknown, _context: SkillContext): AsyncIterable<SkillEvent> {
    const args = input as RevivalInput
    const cfg: RevivalConfig = {
      ...DEFAULT_CONFIG,
      ...(args.__configOverride ?? {}),
      output_mode: (args.__configOverride?.output_mode as OutputMode | undefined) ?? DEFAULT_CONFIG.output_mode,
      task_due_offset_hours:
        typeof args.__configOverride?.task_due_offset_hours === 'number'
          ? args.__configOverride.task_due_offset_hours
          : DEFAULT_CONFIG.task_due_offset_hours,
    }

    const map = args.__mapOverride ?? DEFAULT_MAP
    const { objectionKind, signalKind } = extractKinds(args.signalTypes ?? [])

    if (!objectionKind || !signalKind) {
      yield { type: 'result', data: { status: 'malformed_payload', objection_kind: objectionKind, signal_kind: signalKind } }
      return
    }

    const allowedSignals = map[objectionKind] ?? []
    if (!allowedSignals.includes(signalKind)) {
      yield {
        type: 'result',
        data: {
          status: 'mismatched_pair',
          objection_kind: objectionKind,
          signal_kind: signalKind,
        },
      }
      return
    }

    const claapFetcher = args.__claapFetcher ?? (async () => null)
    const objectionQuote = await claapFetcher(args.entityName, args.companyId)
    if (!objectionQuote) {
      yield { type: 'error', message: 'claap_no_transcript' }
      return
    }

    const draftFn = args.__anthropicDraft ?? (async (a) => defaultDraft(a.entityName, a.objectionQuote, a.signalKind))
    let draft = await draftFn({
      entityName: args.entityName,
      objectionQuote,
      objectionKind,
      signalKind,
      signals: args.signals ?? [],
    })

    const firstAttemptText = `${draft.line1} ${draft.line2}`
    if (hasDisallowedDash(firstAttemptText)) {
      draft = await draftFn({
        entityName: args.entityName,
        objectionQuote,
        objectionKind,
        signalKind,
        signals: args.signals ?? [],
      })
      const retryText = `${draft.line1} ${draft.line2}`
      if (hasDisallowedDash(retryText)) {
        yield { type: 'error', message: 'dash_scan_failed' }
        return
      }
    }

    const messageBody = `${draft.line1}\n\n${draft.line2}`
    const outputBase = {
      status: 'drafted',
      objection_kind: objectionKind,
      signal_kind: signalKind,
      draft,
      output_mode: cfg.output_mode,
    }

    if (cfg.output_mode === 'lemlist_draft') {
      const lemlistDraft = args.__lemlistDraft ?? (async () => ({ campaignId: '' }))
      const campaign = await lemlistDraft({
        name: `Revive: ${args.entityName}`,
        body: messageBody,
      })

      if (args.__slackSend) {
        await args.__slackSend({ text: `Drafted revival for ${args.entityName}`, target: args.companyId })
      }

      yield {
        type: 'result',
        data: {
          ...outputBase,
          campaignId: campaign.campaignId,
        },
      }
      return
    }

    const hubspotTask = args.__hubspotTask ?? (async () => ({ taskId: '' }))
    const dueAt = new Date(Date.parse(args.firedAt) + cfg.task_due_offset_hours * 60 * 60 * 1000).toISOString()
    const task = await hubspotTask({
      subject: `Revive: ${args.entityName}`,
      body: messageBody,
      dueAt,
    })

    if (args.__slackSend) {
      await args.__slackSend({ text: `Drafted revival for ${args.entityName}`, target: args.companyId })
    }

    yield {
      type: 'result',
      data: {
        ...outputBase,
        taskId: task.taskId,
      },
    }
  },
}
