# Context Adapters — Phase 1 Documentation

Context adapters are the pluggable connectors that pull external data into Outbound OS's memory layer. They enable your system to learn from multiple sources: markdown knowledge bases, Notion workspaces, Google Drive documents, and your own campaign performance data.

## Overview

Adapters follow a standard pattern:
1. **Check availability** — verify credentials/config exist
2. **Sync** — pull data, chunk it, and store in memory
3. **Watch** (optional) — monitor for changes and auto-sync

All adapters upsert to the memory layer using content-based hashing, so re-running against unchanged data is a no-op (preserves access history and relationships).

## Built-in Adapters

### 1. Markdown Folder (Always available)

Reads a local markdown knowledge base and chunks it into memory.

**Setup:**
```yaml
# ~/.gtm-os/tenants/<slug>/adapters.yaml
adapters:
  - id: markdown-folder
    enabled: true
    base_dir: "/path/to/your/knowledge-base"
    paths:
      - "Context.md"                          # single file
      - "02_Areas/Marketing/**/*.md"          # glob patterns
      - "wiki/index.md"
```

**Patterns supported:**
- `file.md` — single file
- `folder/*.md` — all .md files in folder
- `folder/**/*.md` — recursive
- `*` — any file in folder
- `**` — any file anywhere (recursive)

**Behavior:**
- Chunks markdown by heading depth (min 500 tokens, max 800)
- Preserves heading hierarchy for context
- Live-watching with chokidar + 30s debounce

---

### 2. Notion Workspace (Requires `NOTION_API_KEY`)

Pulls pages from your Notion workspace into memory.

**Setup:**

1. Create a Notion API token:
   - Go to <https://www.notion.so/my-integrations>
   - Create new integration, generate token
   - Copy secret to env var: `NOTION_API_KEY=secret_...`

2. Configure adapters.yaml:
```yaml
adapters:
  - id: notion-workspace
    enabled: true
    databases:
      - id: "abc123def456..."  # from database URL: notion.so/<id>?v=...
        name: "ICP Definition"
        role: "icp"
      - id: "xyz789..."
        name: "Win/Loss Analysis"
        role: "learnings"
      - id: "..."
        name: "Product Roadmap"
        role: "research"
```

**How to find database ID:**
- Open your Notion database
- Look at URL: `https://www.notion.so/<workspace>/<DB_ID>?v=...`
- Copy the long alphanumeric part (no hyphens)

**Behavior:**
- Queries each database for pages
- Extracts title + properties as metadata
- Chunks content into memory nodes
- Stores provenance (database ID, name, role) in metadata

**Example use:**
- **ICP Definition**: Sync your ideal customer profile docs
- **Win/Loss Analysis**: Extract patterns from past wins/losses
- **Competitor Research**: Store competitive intel for positioning

---

### 3. Google Drive (Requires `GOOGLE_DRIVE_CREDENTIALS`)

Pulls documents and spreadsheets from Google Drive folders into memory.

**Setup:**

1. Create OAuth 2.0 credentials:
   - Go to <https://console.cloud.google.com>
   - Create new project, enable Google Drive API
   - Create OAuth 2.0 credentials (Desktop app)
   - Download credentials JSON
   - Save as env var: `GOOGLE_DRIVE_CREDENTIALS='{"type":"oauth2_service_account",...}'`

2. Configure adapters.yaml:
```yaml
adapters:
  - id: google-drive
    enabled: true
    folders:
      - id: "folder_id_123"
        name: "Competitor Research"
        role: "research"
        mimeTypes:
          - "application/vnd.google-apps.document"  # Google Docs
          - "application/vnd.google-apps.spreadsheet"  # Sheets
      - id: "folder_id_456"
        name: "Sales Playbooks"
        role: "playbooks"
```

**How to find folder ID:**
- Open folder in Google Drive
- URL: `drive.google.com/drive/folders/<FOLDER_ID>`
- Copy the long ID

**Behavior:**
- Queries Google Drive for files in folders
- Downloads and extracts text
- Chunks documents into memory
- Stores file metadata (type, modified date)

---

### 4. Campaign Learner (Always available)

Analyzes your internal campaign performance to extract learnings automatically.

**Setup:**
```yaml
adapters:
  - id: campaign-learner
    enabled: true
    # No additional config required — reads internal campaign tables
```

**What it learns:**
1. **ICP Patterns** — which audience segments convert best
2. **Messaging Angles** — which copy/positioning resonates
3. **Objections** — most common buyer objections
4. **Voice** — tone/style of your best performers
5. **Signals** — which prospecting signals predict conversion

**Example learnings:**
```
[LEARNING] Startups with hiring signals convert at 42% (reply rate)
→ Confidence: validated (based on 150+ leads, 30+ days data)
→ Recommendation: Prioritize hiring signals in next ICP refinement

[LEARNING] "Time savings" angle gets 3x better reply rate for ops teams
→ Confidence: hypothesis (5 campaigns, needs 30 days+)
→ Recommendation: Test this angle in broader audience segment
```

**How it works:**
- Runs weekly (or on demand via `/api/brain/sync/campaign-learner`)
- Queries campaign performance data
- Extracts patterns with confidence scores
- Stores as memory nodes for Brain integration
- High-confidence learnings feed into Intelligence Store

---

## Using Adapters

### Via API

**List available adapters:**
```bash
curl http://localhost:3847/api/brain/adapters?tenant=default
```

Response:
```json
{
  "adapters": [
    { "id": "markdown-folder", "available": true },
    { "id": "notion-workspace", "available": true },
    { "id": "google-drive", "available": false },
    { "id": "campaign-learner", "available": true }
  ]
}
```

**Sync all available adapters:**
```bash
curl -X POST http://localhost:3847/api/brain/sync?tenant=default
```

Response:
```json
{
  "ok": true,
  "results": {
    "markdown-folder": { "added": 45, "updated": 0, "removed": 0, "unchanged": 12 },
    "notion-workspace": { "added": 23, "updated": 0, "removed": 0, "unchanged": 8 },
    "campaign-learner": { "added": 5, "updated": 0, "removed": 0, "unchanged": 0 }
  },
  "totals": { "added": 73, "updated": 0, "removed": 0, "unchanged": 20 }
}
```

**Sync specific adapter:**
```bash
curl -X POST http://localhost:3847/api/brain/sync/notion-workspace?tenant=default
```

### Via CLI (Future)

```bash
yalc-gtm brain:sync               # sync all available
yalc-gtm brain:sync --adapter=notion-workspace  # specific adapter
yalc-gtm brain:list-adapters      # show available
```

### Via UI

The Brain page will show:
- List of connected data sources
- Last sync timestamp + result counts
- Quick-sync button for each adapter
- Auto-sync status (daily/weekly schedule)

---

## Data Flow: Adapter → Memory → Brain

```
┌─────────────────────────────────────────┐
│ Data Sources                            │
├────────────────┬───────────────────────┤
│ Markdown Docs  │ markdown-folder      │
│ Notion DBs     │ notion-workspace     │
│ Google Docs    │ google-drive         │
│ Campaign Data  │ campaign-learner     │
└────────────────┼───────────────────────┘
                 ↓
         ┌───────────────────┐
         │   Adapters        │
         │  (chunk + hash)   │
         └─────────┬─────────┘
                   ↓
         ┌───────────────────┐
         │  Memory Nodes     │
         │  (with confidence)│
         └─────────┬─────────┘
                   ↓
         ┌───────────────────┐
         │  Memory Retrieval │
         │  (semantic search)│
         └─────────┬─────────┘
                   ↓
         ┌───────────────────┐
         │  Brain Context    │
         │  (auto-update)    │
         └─────────┬─────────┘
                   ↓
         ┌───────────────────┐
         │  Skills (guided)  │
         │  by context       │
         └───────────────────┘
```

---

## Advanced: Custom Adapters

You can add your own adapter by:

1. Create `src/lib/context/adapters/my-source.ts`
2. Implement the `ContextAdapter` interface
3. Register in `src/lib/context/adapters/index.ts`

Example template:

```typescript
import type { ContextAdapter, SyncResult } from './types.js'
import { MemoryStore } from '../../memory/store.js'

export const myAdapter: ContextAdapter = {
  id: 'my-source',

  async isAvailable(tenantId: string): boolean {
    // Check if config + credentials exist
    return !!process.env.MY_SOURCE_API_KEY
  },

  async sync(tenantId: string): Promise<SyncResult> {
    const store = new MemoryStore(tenantId)
    let added = 0, unchanged = 0

    // 1. Fetch data from your source
    const data = await fetchFromMySource()

    // 2. Convert to text/markdown
    // 3. Chunk it
    // 4. Upsert via store.upsertNodeBySourceHash()

    return { added, updated: 0, removed: 0, unchanged }
  },

  watch: async () => {
    // Optional: watch for changes and auto-sync
    return () => {}
  },
}
```

---

## Troubleshooting

**Adapter shows as unavailable:**
- Check env vars are set (`NOTION_API_KEY`, `GOOGLE_DRIVE_CREDENTIALS`)
- Verify adapters.yaml config exists
- Check file permissions for markdown-folder path

**Sync returns 0 results:**
- First sync: may take time to chunk and store
- Check console for errors: `yalc-gtm start --verbose`
- Verify data source has content

**Memory not growing:**
- Run sync again — dedup prevents re-runs from adding duplicates
- Check memory node count: `GET /api/brain/context` → check section sizes
- Verify adapters completed successfully

---

## Next Steps

With Phase 1 adapters in place:
1. Connect your primary knowledge sources (Notion ICP, playbooks, research)
2. Let campaign-learner run weekly
3. Watch Intelligence Store build up confidence scores
4. Phase 2: Skills will auto-inject Brain context (ICP, voice, positioning)
5. Phase 3: Brain auto-updates based on high-confidence learnings
