# Regression checklist — paste into PR

After running phases 1-4 from `README.md`, fill this in and paste it as a PR comment.

## Per-bug regression table

| Bug | Static check | Live check | Pass/Fail | Notes |
|---|---|---|---|---|
| 1 — create_campaign references | grep clean | real tools fired in order | | |
| 2 — paused flag fiction | grep clean | no set_campaign_state(start) fired | | |
| 3 — get_lemleads_filters prereq | step 11a present in SKILL.md | call 1 was get_lemleads_filters | | |
| 4 — enrichment posture | stage 12 rewritten | no enrichment flags fired | | |
| 5 — per-lead loop | retry/failure spec present | 5 sequential add_lead calls | | |
| 6 — sequenceId threading | stage 24 + 25 reference seq_xxx | 2× add_sequence_step used real seq_xxx | | |
| 7 — handoff contract | table covers stages 1-23 | seniority_tier extracted correctly | | |
| 8 — dependency in description | substrate mentioned in frontmatter | Claude announced dep at skill load | | |
| 9 — standalone install | README has Node prereq + merge note | /tmp install succeeded from README alone | | |
| 10 — canonical MCP path | OAuth marked alternative | env-var path worked | | |
| 11 — tests scaffolding | tests/ exists with 5 files | dryrun schema validated | | |

## Live happy-path summary

- campaign created: `cam_xxx`
- campaign name: `<must contain QA-YYYY-MM-DD>`
- leads added: `<must be 5>`
- state: `<must be draft>`
- readiness: `<ready | has_errors>`
- credits spent: `<sourcing>` + `<enrichment, must be 0>` = `<total>`

## Edge cases (section 5.5 of brief)

1. **Approval-bypass** (input something other than `approve`): pass/fail + observed
2. **Empty search result** (filters returning 0 leads): pass/fail + observed
3. **MCP unavailable** (disconnect lemlist MCP before approval): pass/fail + observed
4. **Standalone install missing substrate** (copy only orchestrator, not `lemlist/`): pass/fail + observed
5. **Missing `LEMLIST_API_KEY`** (unset before Claude Code restart): pass/fail + observed
6. **Conflicting `.mcp.json` merge** (project already has an unrelated MCP server): pass/fail + observed

## Sign-off

```
Recommendation: <merge | block>
Follow-ups (non-blocking): <list any deferred issues>
```

Merge ONLY if every regression-checklist row = Pass AND every edge case = Pass (or non-blocking + approved).
