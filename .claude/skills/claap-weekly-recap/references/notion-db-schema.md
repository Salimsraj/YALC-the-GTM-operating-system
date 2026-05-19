# Notion DB Schema — GTM Action Items

The skill writes to a Notion database with this shape. Recreate it in your
workspace using the spec below — either via the Notion MCP's
`notion-create-database` (one-shot, recommended) or by hand in the Notion UI.

## Properties (10)

| # | Name | Notion type | Required values | Notes |
|---|---|---|---|---|
| 1 | `Title` | Title | — | The action sentence or focus block name |
| 2 | `Type` | Select | `Action Item` (blue), `Focus Block` (orange) | Distinguishes deal-specific tasks from week-spanning themes |
| 3 | `Status` | Select | `Backlog` (gray), `Focus This Week` (purple), `Done` (green), `Archived` (default) | Drives the Kanban grouping |
| 4 | `Deal / Lead` | Text | — | Free-form deal identifier (company + person). Empty for Focus Block rows. |
| 5 | `Verbatim Quote` | Text | — | The prospect's exact wording (10–25 words) from the transcript |
| 6 | `Claap Link` | URL | — | Direct timestamped URL into the Claap recording |
| 7 | `Source Call Date` | Date | — | Date of the originating call |
| 8 | `Surfaced By` | Select | `Weekly Recap Agent` (purple), `Manual` (gray) | Lets manual entries co-exist with agent-generated cards |
| 9 | `Week` | Text | — | ISO week label like `2026-W20`; used for filtering |
| 10 | `Due` | Date | — | Optional; only set when the call explicitly promised a date |

## Notion MCP DDL (one-shot creation)

```sql
CREATE TABLE (
  "Title" TITLE,
  "Type" SELECT('Action Item':blue, 'Focus Block':orange),
  "Status" SELECT('Backlog':gray, 'Focus This Week':purple, 'Done':green, 'Archived':default),
  "Deal / Lead" RICH_TEXT,
  "Verbatim Quote" RICH_TEXT,
  "Claap Link" URL,
  "Source Call Date" DATE,
  "Surfaced By" SELECT('Weekly Recap Agent':purple, 'Manual':gray),
  "Week" RICH_TEXT,
  "Due" DATE
)
```

Pass this to `notion-create-database` with `title: "GTM Action Items"` and a `parent.page_id` of wherever you want the DB to live.

## DDL to seed select options after the fact

If your DB already exists and the agent fails because a select value isn't allowed, run:

```sql
ALTER COLUMN "Status" SET SELECT('Backlog':gray, 'Focus This Week':purple, 'Done':green, 'Archived':default);
ALTER COLUMN "Type" SET SELECT('Action Item':blue, 'Focus Block':orange);
ALTER COLUMN "Surfaced By" SET SELECT('Weekly Recap Agent':purple, 'Manual':gray);
```

via `notion-update-data-source`.

## Required Kanban view

Add a Board view to the DB grouped by `Status`. Display these properties on each card:

- `Type` (so you can tell Action Items from Focus Blocks at a glance)
- `Deal / Lead`
- `Verbatim Quote`
- `Claap Link`
- `Source Call Date`
- `Week`
- `Surfaced By`
- `Due`

If you have the Notion MCP available, this creates the view in one call:

```
notion-create-view
  database_id: <YOUR_DB_UUID>
  data_source_id: <YOUR_DS_UUID>
  name: "Kanban"
  type: "board"
  configure: |
    GROUP BY "Status";
    SHOW "Title", "Type", "Deal / Lead", "Verbatim Quote",
         "Claap Link", "Source Call Date", "Week", "Surfaced By", "Due"
```

## Optional: "This Week" filter

Saved view that shows only cards from the current ISO week:

```
filter: Week is current_iso_week
```

You can also add a "Focus This Week only" filtered view that shows just the
Focus Block cards across the current week — useful as your Monday-morning
strategic agenda.

## Where to put the DB in your Notion workspace

Anywhere. The skill only needs the data source ID. Common parents:

- Under your personal HQ page
- Under a "GTM" or "Operations" hub
- Standalone at workspace root

You can move it later — the data source ID stays stable.

## Why these specific 10 properties

| Concern | Property that addresses it |
|---|---|
| What action to take | `Title` |
| Whether it's tactical or strategic | `Type` |
| Where it sits in your weekly workflow | `Status` (drives Kanban) |
| Whose deal this is | `Deal / Lead` |
| Evidence it's a real ask, not paraphrasing | `Verbatim Quote` |
| One-click jump to the moment in the call | `Claap Link` |
| Recency / aging | `Source Call Date` |
| Manual vs. agent provenance | `Surfaced By` |
| Weekly filtering | `Week` |
| Time-bounded commitments (rare) | `Due` |

Cut nothing — the verbatim quote and the timestamped Claap link are what
make these cards usable without re-reading the transcript. That's the whole
point of the workflow.
