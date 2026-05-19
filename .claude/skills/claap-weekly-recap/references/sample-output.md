# Sample Output — A Real Run

Anonymized snapshot of one Saturday-morning run. Use this to sanity-check what
your first run should look like.

## Inputs

```
gtm_action_items_data_source_id: collection://<your-ds>
slack_recipient: U<your-user-id>
week_label: 2026-W21
lookback_days: 7
prior_recap_history_path: ~/.gtm-os/state/claap-recap-history.md
```

## Step 1 — Calls pulled

```
Claap workspaces returned: 1 ("Acme GTM")
Recordings in last 7 days: 8
Recordings under 3 min (skipped): 5
Recordings processed: 3
```

The 5 skipped recordings were Claap onboarding tutorials that the user had
watched but not recorded as sales calls — the duration filter catches them
cleanly.

## Step 2 — Clustering

```
Calls grouped by deal:
  Mobile Co — 2 calls (Tue, Thu)
  GlobalPayrollCo — 2 calls (Wed, Fri)
  Internal (founder/COO) — 1 call (Wed)
```

## Step 3 — Action items (sample)

12 cards landed in the Notion Kanban. Showing 4 of them.

### Card 1 — Action Item · Backlog

```
Title:           Build HeyReach funnel report for ROI review
Deal / Lead:     Mobile Co — Sarah K. (Head of Growth)
Verbatim Quote:  "I need actual numbers before the QBR. Just give me the connect-to-reply funnel for the last 90 days."
Claap Link:      https://app.claap.io/c/abc123?t=00:14:32
Source Call Date: 2026-05-14
Surfaced By:     Weekly Recap Agent
Week:            2026-W21
Due:             2026-05-22 (called out on the call)
```

### Card 2 — Action Item · Backlog

```
Title:           Send compliance audit doc to David at GlobalPayrollCo
Deal / Lead:     GlobalPayrollCo — David M. (VP Ops)
Verbatim Quote:  "We'd need the SOC 2 in front of our legal team before next week's sync."
Claap Link:      https://app.claap.io/c/def456?t=00:08:11
Source Call Date: 2026-05-16
Surfaced By:     Weekly Recap Agent
Week:            2026-W21
```

### Card 3 — Focus Block · Focus This Week

```
Title:           Tighten last-mile lead ownership
Verbatim Quote:  Surfaced in 2 deals (Mobile Co, GlobalPayrollCo). Mobile Co has 310 unactioned replies; GlobalPayrollCo lacks a routing rule.
Claap Link:      https://app.claap.io/c/abc123?t=00:21:47
Source Call Date: 2026-05-16
Surfaced By:     Weekly Recap Agent
Week:            2026-W21
```

### Card 4 — Focus Block · Focus This Week

```
Title:           Measure LinkedIn channel ROI
Verbatim Quote:  Surfaced in 1 deal (Mobile Co), called out 3x in same call. No attribution tracking after 12 months.
Claap Link:      https://app.claap.io/c/abc123?t=00:32:05
Source Call Date: 2026-05-14
Surfaced By:     Weekly Recap Agent
Week:            2026-W21
```

## Step 7 — Slack DM delivered

```
🪑 Saturday recap — Week of May 18

8 action items across 3 deals → https://www.notion.so/<your-kanban>
4 focus blocks for next week:
  · Tighten last-mile lead ownership (2 deals)
  · Unblock campaign activation pipeline (2 deals)
  · Measure LinkedIn channel ROI (1 deal, 3x in same call)
  · Scale operator delegation model (internal team capacity)

(first run — no carry-over yet)
```

## Step 8 — History file

```
# Claap Weekly Recap — Focus Block History

2026-W21: Tighten last-mile lead ownership | Unblock campaign activation pipeline | Measure LinkedIn channel ROI | Scale operator delegation model
```

Next week's run will compare against this line and flag continuity:

```
Carry-over from last week:
  · Tighten last-mile lead ownership: narrowing (was 2 deals → now 1)
  · Measure LinkedIn channel ROI: still surfacing (1 deal → 2 deals)
  · Unblock campaign activation pipeline: resolved
  · Scale operator delegation model: still surfacing (was internal → now Mobile Co)
```

## What "good" looks like

- Every action item has a verbatim quote ≥ 10 words and a Claap timestamp URL
- Focus blocks span ≥ 2 calls OR are called out ≥ 3x in a single call
- Action item titles are ≤ 12 words and name a person or deal
- Focus block titles are ≤ 8 words and describe a pattern, not a single deal
- The Slack message fits in a single screen-height on mobile
- The history file gains exactly one line per run

## What "bad" looks like (red flags during sanity-check)

- Action items reading like "follow up" or "send email" without specificity → the agent fell back to generic
- Verbatim quotes that look paraphrased rather than copy-pasted → check transcript fetching is returning raw text
- Focus blocks that are actually just one deal's restated objection → the agent didn't cluster properly
- No Claap link or a non-timestamped link → transcript moment extraction missed the timestamp; the call recording URL is being used as a fallback

If any of these show up in your first run, open SKILL.md and look at Steps 3–4
— the quality bar there is the spec.
