# claap-weekly-recap

A Claude Code skill that turns a week of Claap-recorded sales calls into a Notion Kanban of action items + focus blocks, delivered with a Slack summary every Saturday morning.

## What it does

Every time it runs (default: Saturday 08:00 local), the skill:

1. Pulls the last 7 days of Claap recordings via Claap MCP
2. Extracts per-deal action items with the prospect's verbatim wording + a timestamped Claap link to the moment in the call
3. Synthesizes 2–4 focus blocks (patterns across multiple calls — e.g. "pricing objection rebuttal — surfaced in 4 deals")
4. Writes everything to a Notion Kanban DB (Backlog / Focus This Week / Done / Archived columns)
5. Sends a single Slack DM summary with a link back to the Kanban
6. Logs focus block titles to a history file so next week's run can detect carry-over

## Why it exists

Most "AI meeting notes" tools stop at one-meeting summaries. The actual GTM problem is: 11 calls happened this week, the signal is scattered across 11 recordings, and on Saturday morning you can't remember which prospect said what or what to focus on next week. This skill turns the week into a week's worth of decisions.

## Quickstart (5 minutes)

### 1. Prerequisites

- A Claap account with recordings (free trial works: `claap.io`)
- A Claap API key — generate at `app.claap.io → Settings → API Keys`
- A Notion workspace with the Notion MCP connected (claude.ai connector or `mcp.notion.com`)
- A Slack workspace with the Slack MCP connected, OR a Slack incoming webhook URL

### 2. Register Claap MCP in Claude Code

Add to your project-scoped `.mcp.json`:

```json
"claap": {
  "url": "https://api.claap.io/mcp",
  "type": "http",
  "headers": {
    "Authorization": "Bearer ${CLAAP_API_KEY}"
  }
}
```

Export `CLAAP_API_KEY` in your shell env. Restart Claude Code. Verify with `/mcp`.

Full instructions including troubleshooting: [`references/setup.md`](references/setup.md).

### 3. Create the Notion DB

Build the database in your Notion workspace using the 10-property schema + DDL in [`references/notion-db-schema.md`](references/notion-db-schema.md). Two paths:

- **Via Notion MCP** (one-shot): pass the `CREATE TABLE (…)` block from that doc to `notion-create-database` with `parent.page_id` of wherever you want it to live.
- **By hand in Notion UI**: create a new DB, add the 10 properties with the listed types and select options, add a Board view grouped by `Status`.

Grab the data source ID once created (`collection://...` — visible when you `notion-fetch` the DB, or in the share URL).

### 4. Resolve your Slack user ID

In Slack, click your name → "Copy member ID". Or ask Claude Code: `"what's my Slack user ID"` and let `slack_search_users` resolve it.

### 5. Run it once interactively

In Claude Code, from your workspace:

```
Run the claap-weekly-recap skill with:
  gtm_action_items_data_source_id: collection://<YOUR-DS-ID>
  slack_recipient: U<YOUR-USER-ID>
  lookback_days: 7
```

Watch the Kanban populate and your Slack DM land.

### 6. Schedule it (pick one)

- **Yalc agent system** (cross-platform): see [`configs/agents/claap-weekly-recap.yaml`](../../../configs/agents/claap-weekly-recap.yaml) and `npx tsx src/cli/index.ts agent:install --agent claap-weekly-recap`.
- **macOS launchd** (native): copy [`scripts/run.sh.template`](scripts/run.sh.template) + [`scripts/launchd.plist.template`](scripts/launchd.plist.template) to your local paths, fill in placeholders, `launchctl load` the plist.
- **Linux cron**: see [`scripts/cron-example.txt`](scripts/cron-example.txt).
- **Linux systemd**: see [`scripts/systemd.timer.template`](scripts/systemd.timer.template).

## Files in this skill

```
.claude/skills/claap-weekly-recap/
├── SKILL.md                          ← agent definition (the system prompt Claude reads)
├── README.md                         ← this file
├── references/
│   ├── setup.md                      ← full MCP + env + Slack setup walkthrough
│   ├── notion-db-schema.md           ← 10-property DDL + Kanban view DSL
│   └── sample-output.md              ← a real run's outputs (action items + Slack DM)
└── scripts/
    ├── run.sh.template               ← wrapper script for headless `claude -p` invocation
    ├── launchd.plist.template        ← macOS scheduled run
    ├── cron-example.txt              ← Linux cron alternative
    └── systemd.timer.template        ← Linux systemd alternative
```

## Notion DB schema (10 properties)

| Property | Type | Notes |
|---|---|---|
| `Title` | title | Action sentence or focus block name |
| `Type` | select | `Action Item` / `Focus Block` |
| `Status` | select | `Backlog` / `Focus This Week` / `Done` / `Archived` (Kanban grouping) |
| `Deal / Lead` | rich_text | Deal identifier (empty for focus blocks) |
| `Verbatim Quote` | rich_text | Prospect's exact wording from the call |
| `Claap Link` | url | Timestamped URL into the recording |
| `Source Call Date` | date | When the originating call happened |
| `Surfaced By` | select | `Weekly Recap Agent` / `Manual` |
| `Week` | rich_text | ISO week label (e.g. `2026-W20`) |
| `Due` | date | Optional, only when the call explicitly promised a date |

Add a Kanban view grouped by `Status`. Save a filter "This Week" where `Week = current ISO week`.

## What ships with this skill vs what you bring

| Ships with this skill | You bring |
|---|---|
| The system prompt (`SKILL.md`) | Claap account + API key |
| Notion DB schema + DDL | A Notion workspace (and Notion MCP) |
| Scheduler templates (launchd / cron / systemd / Yalc agent yaml) | A Slack user ID (and Slack MCP or webhook URL) |
| Sample output for sanity-checking | One run to seed the history file |

## Companion code (Yalc OSS repo)

For orchestrator skills that run in Node (cold email, qualifier, personalize) and need to JOIN against transcripts in local SQLite, the Yalc repo also includes a thin persistence slice:

- `callRecordings` + `callTranscripts` tables ([`src/lib/db/schema.ts`](../../../src/lib/db/schema.ts))
- Claap REST service ([`src/lib/services/claap.ts`](../../../src/lib/services/claap.ts))
- Inbound webhook handler at `POST /webhooks/claap` ([`src/lib/server/routes/claap-webhook.ts`](../../../src/lib/server/routes/claap-webhook.ts))
- `yalc-gtm calls:sync --lookback-days 7` CLI ([`src/cli/commands/calls.ts`](../../../src/cli/commands/calls.ts))

You don't need any of this if you only want the skill. It's there for the orchestrator path.

## Status notes (2026-05-19)

- Claap MCP endpoint at `https://api.claap.io/mcp` is stable; `CLAAP_API_KEY` authenticates over `Authorization: Bearer …`.
- Claap REST endpoints (`/v1/calls`, etc.) return 401 with the same MCP key — they likely require a separate REST scope. The Yalc thin slice will work once Claap exposes a REST scope on the same key. The skill itself doesn't need REST; MCP is sufficient.

## License

Same as the parent repository.
