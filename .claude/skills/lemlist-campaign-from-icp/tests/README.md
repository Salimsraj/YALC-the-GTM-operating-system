# lemlist-campaign-from-icp — Tests

QA scaffolding for the skill. Four phases, run in order.

## Phase 1 — Static checks (no network)

Run from repo root. Each command should exit clean.

```sh
grep -rn "create_campaign[^_]" .claude/skills/lemlist-campaign-from-icp/   # zero matches
grep -rn "paused flag"        .claude/skills/lemlist-campaign-from-icp/    # zero matches
git diff --stat main -- .claude/skills/lemlist/                            # zero files changed
npx ajv-cli validate -s .claude/skills/lemlist-campaign-from-icp/tests/dryrun-schema.json \
                     -d .claude/skills/lemlist-campaign-from-icp/examples/dryrun-output-sample.json
```

## Phase 2 — Sandbox install (simulate the standalone user path)

Do NOT run the live test inside `~/Desktop/gtm-os/` — that path hides the standalone-install bugs.

```sh
mkdir /tmp/lemlist-skill-qa && cd /tmp/lemlist-skill-qa
gh repo clone Othmane-Khadri/YALC-the-GTM-operating-system /tmp/yalc-src
cd /tmp/yalc-src && git checkout fix/lemlist-campaign-from-icp-runtime
cd /tmp/lemlist-skill-qa
mkdir -p .claude/skills
cp -r /tmp/yalc-src/.claude/skills/lemlist-campaign-from-icp ./.claude/skills/
cp -r /tmp/yalc-src/.claude/skills/lemlist ./.claude/skills/
cp /tmp/yalc-src/.mcp.json .
export LEMLIST_API_KEY=<your sandbox key>
claude    # start Claude Code here
```

Verify `/mcp` shows lemlist with the expected tools.

## Phase 3 — Live happy-path test

Paste the prompt from `sandbox-prompt.md`. Capture every MCP call, in order, with payload shapes.

Expected call order matches `expected-mcp-calls.md`.

Verify in the lemlist UI after the run:
- [ ] Campaign exists with `QA-{today}` in the name
- [ ] State is **draft** (not running, not paused-after-start)
- [ ] Sequence has exactly 3 email steps with the dryrun's delays
- [ ] Leads list has 5 contacts, deduped, with `customVariables` populated
- [ ] `validate_campaign_readiness` result matches what the skill reported

## Phase 4 — Edge cases

Run all 6 edge cases listed in `regression-checklist.md`. Log each one with input + observed + expected + pass/fail.

## Sign-off

Fill in `regression-checklist.md` and paste it as a PR comment with the format from the brief's section 5.7.
