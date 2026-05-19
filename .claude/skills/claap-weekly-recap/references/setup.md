# Setup — Claap MCP, env, Notion DB, Slack

Five steps. Plan on 5–10 minutes for first-time setup.

## 1. Generate a Claap API key

1. Sign in at `app.claap.io`.
2. Settings → Integrations → API Keys → "Create new key".
3. Scope: select the workspace whose recordings you want to read. Most users have one workspace.
4. Copy the key (starts with `cla_`). You'll only see it once.

Store it in your shell environment:

```bash
# Option A — single env file
echo 'export CLAAP_API_KEY="cla_..."' >> ~/.zshenv

# Option B — keep it in a project .env file your wrapper sources
echo 'CLAAP_API_KEY=cla_...' >> ~/.gtm-os/.env
```

Reload your shell (`exec zsh`) before continuing.

## 2. Register Claap MCP in Claude Code

Claap exposes a single HTTP MCP endpoint at `https://api.claap.io/mcp`. Add it to your project's `.mcp.json` (or `~/.claude/settings.json` for user-scope):

```json
{
  "mcpServers": {
    "claap": {
      "url": "https://api.claap.io/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer ${CLAAP_API_KEY}"
      }
    }
  }
}
```

Restart Claude Code. Verify:

```
/mcp
```

You should see `claap` in the connected servers list. Then ask: *"Use the claap MCP — list my workspaces."* If you see one or more workspaces returned, you're wired.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `claap` MCP missing from `/mcp` | Env not loaded at MCP-launch time | `echo $CLAAP_API_KEY` — if empty, fix step 1. Restart Claude Code after setting. |
| `401 unauthorized` from MCP | Wrong key or expired | Regenerate key in Claap. Update env. Restart. |
| Tools load but `list_workspaces` returns empty | Key scoped to a workspace you don't recognize | Try a fresh key with broader scope. |
| `${CLAAP_API_KEY}` interpolation not applied (literal `${...}` sent as auth) | Headless `claude -p` doesn't interpolate `.mcp.json` env vars in some versions | Use `--mcp-config` with a temp file containing the literal key (see `scripts/run.sh.template`) |

## 3. Create the Notion GTM Action Items DB

Two ways:

### Way A — Via Notion MCP (one-shot)

Open the DDL in [`notion-db-schema.md`](notion-db-schema.md) and run the `CREATE TABLE` block through `notion-create-database` with a `parent.page_id` set to wherever you want the DB to live. The MCP returns the new DB URL and data source ID in one response.

### Way B — By hand in Notion UI

Create a new database in your workspace. Add the 10 properties listed in [`notion-db-schema.md`](notion-db-schema.md) with the exact names, types, and select options. Then add a Board view grouped by `Status`.

### Get the data source ID

Open the DB in Notion. Click "..." → "Copy link". The URL is like `https://notion.so/<workspace>/<DB_ID>?v=...`. Strip everything after `?`. Run in Claude Code: *"fetch the Notion DB at <URL>"* — the response includes `<data-source url="collection://...">`. That `collection://...` is what the skill expects.

Save it for step 5.

## 4. Wire up Slack delivery

Two options:

### Option A — Slack MCP (recommended if you use Claude Code interactively)

If you have the Slack connector enabled in Claude Code (via claude.ai → Settings → Connectors), you're done — `slack_send_message` will work in interactive sessions. For headless `claude -p` runs, you may need to use Option B.

Get your user ID:

- In Slack desktop: click your avatar → "View profile" → "..." → "Copy member ID". It looks like `U087ABCDEF`.
- Or from Claude Code: ask *"what is my Slack user ID"* and let `slack_search_users` resolve it.

### Option B — Slack incoming webhook (no MCP, works in any context)

1. In Slack: <https://api.slack.com/messaging/webhooks> → "Create app" → "From scratch" → pick your workspace.
2. Enable "Incoming Webhooks" → "Add New Webhook to Workspace" → pick the channel or "Directly to yourself".
3. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`).
4. Export it:

```bash
echo 'export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."' >> ~/.zshenv
```

The wrapper script template handles either path — set whichever env var is available.

## 5. Run the skill once interactively

In Claude Code, from a session where Claap + Notion + Slack MCPs all load, paste:

```
Run the claap-weekly-recap skill with:
  gtm_action_items_data_source_id: collection://<YOUR-DS-ID>
  slack_recipient: U<YOUR-USER-ID>
  lookback_days: 7
  prior_recap_history_path: ~/.gtm-os/state/claap-recap-history.md
```

The agent will:

1. Call `mcp__claap__list_workspaces` and cache your `workspaceId`
2. Pull the last 7 days of recordings
3. Fetch each transcript
4. Cluster per deal, extract action items, synthesize focus blocks
5. Write cards to your Notion Kanban
6. Send a Slack DM summary
7. Write a baseline history file (no carry-over on first run)

Watch your Kanban populate. Verify the cards link back to real Claap timestamps.

## 6. Schedule it

Pick the scheduler that matches your environment — see `../README.md` § "Schedule it (pick one)" for cross-platform options.

The most common pattern (macOS, native): copy `scripts/run.sh.template` to `~/bin/run_claap_weekly_recap.sh`, fill in placeholders, `chmod +x` it, then load `scripts/launchd.plist.template` via `launchctl load` after replacing placeholders.

## What you should see after the first scheduled run

- Notion Kanban: 5–15 new cards in `Backlog` and `Focus This Week` columns
- Slack DM: a single short summary referencing the Notion link
- A history file at `~/.gtm-os/state/claap-recap-history.md` with this week's focus block titles

Next week's run will reference the history file to flag carry-over ("pricing objection still surfacing — was 4 deals last week, 6 this week").

## Known limitations (2026-05-19)

- Claap REST endpoints (`api.claap.io/v1/*`) return 401 with the MCP key. The Yalc thin persistence slice (`yalc-gtm calls:sync`) is therefore parked until Claap exposes a REST scope on the same key. The skill itself runs entirely on MCP and is not affected.
- The Slack MCP from claude.ai (claude_ai_Slack) is OAuth-bound to your interactive web session and may not auto-load in headless `claude -p`. Use Option B (webhook URL) for headless reliability.
- If your Slack workspace blocks DMs from new apps, the bot scope may need approval. Webhook URLs sidestep this.
