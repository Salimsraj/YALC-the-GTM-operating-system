# Campaign & Outbound Rules

Applies to: `src/lib/campaign/`, `src/lib/skills/builtin/track-campaign.ts`

## Context to Load
- `src/lib/outbound/rules.ts` — the 8 outbound message validation rules
- `src/lib/campaign/types.ts` — campaign and sequence type definitions
- `src/lib/campaign/sequence-engine.ts` — sequence state machine

## Hard Rules
1. **ALL outgoing messages must pass `validateMessage()`** from `src/lib/outbound/rules.ts` before send. No exceptions.
2. **Rate limits:** 30 LinkedIn connects/day via Unipile token bucket (`src/lib/rate-limiter/`).
3. **Sequence timing:** connect -> 2 days -> DM1 -> 3 days -> DM2. Configurable per campaign but these are defaults.
4. **Campaign lifecycle:** `draft -> scheduled -> active -> paused -> completed`. Only valid transitions allowed.
5. **A/B testing** uses chi-squared with Wilson-Hilferty approximation, p < 0.05. See `src/lib/campaign/significance.ts`.
6. **Never send DMs to prospects who already replied.** Check reply status before every send action.
7. **Every campaign that ships, regardless of channel, must be tracked in the local YALC SQLite (`campaigns` / `campaign_variants` / `campaign_leads`).** The retro, dashboard, and monthly-report skills all read from these tables — if a campaign isn't there, those skills are blind to it. After launching anything in HeyReach, Unipile, or Instantly, the launch flow must end with a write to the local DB (either via `campaign:create` / `campaign:create-sequence`, or via the matching importer below). No "I'll record it later."
8. **HeyReach campaigns: run `npx tsx src/cli/index.ts campaign:import-heyreach` after every launch.** The command is idempotent and scoped to the sender account (`--sender-account-id <id>`, defaults to David Small = 160491). Re-running upserts the same rows, refreshes funnel aggregates from `/stats/GetOverallStats`, and **auto-extracts the real outbound DM copy + reply-step attribution from chatrooms via the HeyReach MCP** — so `campaign_variants.dm1Template` / `dm2Template` carry the actual text David sent, and `campaigns.metrics.replyAttribution` shows where in the sequence each conversation first replied. The retro and strategy skills both depend on this data being fresh; the `campaign-strategy` skill auto-runs the import as step 1 of its procedure.
9. **The campaign-strategy skill is the pre-flight surface.** When David is building a new campaign (not retroing a past one), route to `campaign-strategy`, not `improve-campaign`. The strategy skill reads every past campaign's funnel + real copy + reply attribution + every prior retro + validated intelligence and proposes angle / audience / batch size / channel choice / testable hypotheses. It does NOT draft outbound copy — handoff to `refine-outbound-copy` (for tenant client campaigns) or draft in chat against voice rules (for Earleads-internal campaigns).

## List-build Rules
1. **5 leads per company hard-cap** by default for any campaign list-build. Over-source 3-5×, rank, keep top 5. Ranking signals (priority order): exact title match → seniority level → tenure at company → HQ-country office → recent LinkedIn activity. Confirm with user at campaign start before sourcing if a different cap is needed.
2. **Sourcing method preference (updated 2026-07-16):** Companies — Exa or Linkup for now; Apollo or AI Ark become the only primary tools once configured, with Exa/Linkup dropping to backup-only for when they return nothing. People — Apollo first, AI Ark second, FullEnrich third. Email/phone lookup — FullEnrich or BetterEnrich only, no other provider. Social/ads scraping (Facebook Ads Library, likes, comments, posts) — Apify. Align on tool at campaign start before running anything. Full detail in `.claude/rules/enrichment.md`.
3. **Persona-specific filters** must be agreed up-front and saved in the campaign's source script. Examples: "global payroll only, never bare Head of Payroll" (datascalehr) — see `feedback_global_payroll_roles.md`.
4. **Pre-flight credit display + caching** — every list-build script must, on startup, print credit balances for all providers it will touch (Crustdata, Clay, Firecrawl, Unipile, etc.) and flag any below ~3× estimated burn. Every external API response must be cached on the first call into `data/scrapes/<campaign>/<provider>-cache/<key>.json`. `FORCE=1` env bypasses cache. See `feedback_credit_check_and_caching.md`.

## Copywriting Workflow (added 2026-07-16)
When writing any outbound message, use the copywriting skills already in this repo (`.claude/skills/lemlist/copywriting-first-touch`, `copywriting-follow-up`, `copywriting-vp-sequence`, `copywriting-manager-sequence`, `copywriting-ic-sequence`, `copywriting-refiner`, `cta-designer`) and follow their doctrine exactly — do not freehand copy that skips their structure. Never copy-paste raw research findings (stats, funding numbers, founder bios, review quotes) directly into the message body — that's what makes copy read as AI-generated. Research findings inform email 2+ (root cause / proof), not the email 1 opener. Run every draft against `copywriting-refiner`'s 8-point checklist before presenting it.

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/campaign/creator.ts` | Campaign creation logic |
| `src/lib/campaign/tracker.ts` | Poll Unipile, advance sequences |
| `src/lib/campaign/sequence-engine.ts` | State machine for sequence steps |
| `src/lib/campaign/significance.ts` | A/B test statistical significance |
| `src/lib/campaign/intelligence-report.ts` | Weekly campaign intelligence |
| `src/lib/campaign/optimizer.ts` | Auto-optimization based on signals |
