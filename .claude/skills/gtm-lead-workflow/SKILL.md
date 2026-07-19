---
name: gtm-lead-workflow
description: Use whenever building a company/lead list, finding people at target companies, finding an email or phone number for someone, scraping Facebook/social content (ads, likes, comments, posts), or writing outbound copy for a GTM campaign. Enforces the tool-routing order agreed for this project so it never has to be re-explained. Triggers include "find companies for X", "build a lead list", "find qualified companies for [client]", "find people at these companies", "get me their email", "find their phone number", "scrape this Facebook page/ads/post", "write outreach for this list", "draft the copy for these leads", or `/gtm-lead-workflow`.
---

# GTM Lead Workflow

This skill is the invokable entry point for the standard find → enrich → write loop. It does not duplicate the routing rules — those live in `.claude/rules/enrichment.md` and `.claude/rules/campaigns.md` and are the source of truth. Read both before running any step below; if this file and those rule files ever disagree, the rule files win and this file is stale.

## When to use

- Sourcing a company/lead list for any client or campaign
- Finding named people (decision-makers) at a set of target companies
- Finding an email or phone number for an already-identified person
- Scraping Facebook Ads Library, likes, comments, or posts
- Writing the outbound copy once a qualified list exists

**Don't use for:** running an already-built campaign (`track-campaigns`), qualifying leads already in the DB (`qualify-leads`), or a full lookalike-anchored discovery pipeline (`prospect-discovery-pipeline` — that's a specific 5-phase flow, this skill is the general-purpose router).

## The 5 steps, in order

### 1. Company sourcing
Current default: **Exa or Linkup**. Once Apollo / AI Ark are configured in this environment, they become the only primary tools — Exa/Linkup drop to backup-only, used when Apollo/AI Ark return nothing for the ICP. Full detail: `.claude/rules/enrichment.md` → Company Sourcing Method.

### 2. People sourcing
Priority order: **Apollo → AI Ark → FullEnrich**. Full detail: `.claude/rules/enrichment.md` → People Sourcing Method.

### 3. Contact enrichment (email / phone only)
**FullEnrich or BetterEnrich only** — no other provider is authorized for this, even if it also offers email/phone lookup. Full detail: `.claude/rules/enrichment.md` → Contact Enrichment Method.

### 4. Social / ads scraping (only when the task calls for it)
**Apify** for Facebook Ads Library, likes, comments, posts, or any other social platform content. Never attempt direct WebFetch/curl scraping of these surfaces — they're JS-rendered and bot-protected and it will fail. Full detail: `.claude/rules/enrichment.md` → Social & Ads Scraping Method.

### 5. Copywriting
Route every outbound message through the existing `.claude/skills/lemlist/copywriting-*` skills (`copywriting-first-touch`, `copywriting-vp-sequence`, `copywriting-manager-sequence`, `copywriting-ic-sequence`, `copywriting-follow-up`) and `cta-designer` for the CTA. Never copy-paste raw research findings (stats, funding numbers, founder bios, review quotes) directly into the message body — that reads as AI-generated. Research belongs in a follow-up email, not the email-1 opener. Run every draft against `copywriting-refiner`'s 8-point checklist before presenting it. Full detail: `.claude/rules/campaigns.md` → Copywriting Workflow.

## Fallback behavior

If the authorized tool for a step isn't connected/configured in the current session (no API key, no MCP connection), say so explicitly rather than silently substituting a different provider or fabricating results. Only fall back to a documented backup (e.g. Exa/Linkup when Apollo/AI Ark return nothing) — never invent a new fallback that isn't in the rule files.

## Related

- `.claude/rules/enrichment.md` — provider routing, source of truth
- `.claude/rules/campaigns.md` — list-build caps, copywriting workflow
- `prospect-discovery-pipeline` — the lookalike-anchored 5-phase variant of this same loop
- `qualify-leads` — once a list exists, run it through the 7-gate pipeline
- `launch-linkedin-campaign` / `send-cold-email` — what runs after copy is approved
