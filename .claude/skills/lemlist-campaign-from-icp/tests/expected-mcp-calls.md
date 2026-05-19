# Expected MCP call order

For the sandbox prompt in `sandbox-prompt.md`, the orchestrator must produce exactly the following MCP calls, in this order.

Before approval (discovery only):

1. **`get_lemleads_filters`** — mode `people`
2. **`lemleads_search`** — `{mode: "people", filters: [...derived from registry...], size: 5}`
3. (no MCP calls — Claude writes the dryrun to `~/.gtm-os/lemlist-campaign-from-icp/dryrun-*.json` and STOPS, awaiting user `approve`)

After QA types `approve`:

4. **`create_campaign_with_sequence`** — `{name: "<contains 'QA-{today}'>", subject: <step 1 subject>, body: <step 1 body>}` → captures `campaignId`, `sequenceId`
5. **`add_sequence_step`** × 2 — once per follow-up step, with `delay > 0`, `delayType: "within"`, `userConfirmed: true`
6. **`add_lead_to_campaign`** × 5 — one call per lead, sequential. No enrichment flags set (`findEmail`, `verifyEmail`, `linkedinEnrichment`, `findPhone` all absent or `false`). `deduplicate: true`. `customVariables: {angle, persona_tier}`.
7. **`validate_campaign_readiness`** — `{campaignId}` → surface result to user
8. (no MCP calls — Claude prints `https://app.lemlist.com/campaigns/<campaignId>` for review)

Calls that MUST NOT appear (immediate FAIL if observed):

- `set_campaign_state` with `action: "start"` (Bug 2 fail)
- Any `add_lead_to_campaign` call with `findEmail`/`verifyEmail`/`linkedinEnrichment`/`findPhone` set to `true` (Bug 4 fail)
- `create_campaign` (bare name) — does not exist (Bug 1 fail)
- Any silent retry on MCP failure (Bug 5 / safety contract fail)
