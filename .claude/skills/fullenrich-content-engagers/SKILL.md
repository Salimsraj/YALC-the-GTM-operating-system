---
name: fullenrich-content-engagers
description: Use when the user says "enrich people who engaged with this post", "qualify post engagers with FullEnrich", "scrape and enrich LinkedIn post {URL}", "engagers from this post into a CSV", "enrich this CSV of leads", "FullEnrich content engagers", or any variant indicating they want to convert a list of leads — either LinkedIn post likers/commenters scraped via Unipile, or a bring-your-own CSV — into ICP-qualified, enriched leads via FullEnrich v2 bulk enrichment with webhook callback delivery.
version: 2.0.0
---

# FullEnrich Content Engagers

One command turns a list of leads into a CSV of ICP-qualified prospects with verified work emails and phones. Two input modes:

- **URL mode** — scrape engagers from a LinkedIn post via Unipile
- **CSV mode** — bring your own list (any source: Sales Navigator export, PhantomBuster, Evaboot, manual paste, etc.)

Both modes converge on the same ICP filter + FullEnrich enrichment pipeline.

## When This Skill Applies

- "enrich people who engaged with this post {URL}"
- "qualify post engagers with FullEnrich"
- "scrape and enrich LinkedIn post {URL}"
- "engagers from {URL} into a CSV"
- "enrich this CSV of leads with FullEnrich"
- "qualify and enrich leads.csv"

## What This Skill Does NOT Do

- Does not write outreach copy. Pair with `personalize-message` after.
- Does not push to a CRM.
- **Does not spend credits without explicit user approval.** See "Credit safety contract" below.

## Credit safety contract (MANDATORY)

This skill spends FullEnrich credits, which cost real money. Safeguards:

1. **Always shows current balance** before doing anything.
2. **Always shows estimated cost** of the run.
3. **`--max-credits N` ceiling** (default 500) — auto-trims the contact list to fit.
4. **Hard-approval prompt** — blocks on stdin until the user types `yes`. If stdin is not a TTY, the script aborts unless `--yes` is passed.
5. **`--dry-run` mode** — scrapes engagers + applies ICP without spending a credit.

**When Claude invokes this skill on a user's behalf:**
1. ALWAYS run with `--dry-run` first to surface the engager count, ICP-pass count, and estimated cost.
2. Quote the EXACT estimated credit cost back to the user.
3. WAIT for explicit user confirmation before re-running without `--dry-run`.
4. Only pass `--yes` to the script when the user has approved the spend in this conversation.
5. Exception: respect locally modified scripts — the user took ownership.

## Prerequisites

URL mode requires all four:
```
FULLENRICH_API_KEY=    # https://app.fullenrich.com/app/api
UNIPILE_API_KEY=       # https://dashboard.unipile.com
UNIPILE_DSN=           # e.g. https://api18.unipile.com:14891
UNIPILE_ACCOUNT_ID=    # the LinkedIn account ID under Unipile
```

CSV mode requires only:
```
FULLENRICH_API_KEY=
```

Optional (both modes):
```
FULLENRICH_WEBHOOK_URL=  # public URL for FullEnrich callbacks; otherwise webhook.site fallback
```

## Workflow

1. **Resolve input source**
   - URL mode: resolve `social_id` via Unipile `get-post`, then `list-post-comments` + `list-post-reactions`.
   - CSV mode: parse `--csv` file, map columns (case-insensitive header aliases for `first_name`, `last_name`, `linkedin_url`, `title`, `company`, etc.).
2. **Dedupe** — keyed on `linkedin_url` when present, otherwise `first_name|last_name|company`. Rows missing first_name AND (linkedin_url OR company) are dropped.
3. **Apply ICP filter** — load `config/icp.json` (job-title regex, seniority allow-list, geo, company-size), score each contact 0–100, drop everything below the threshold.
4. **Estimate cost + confirm** — show the cost preview, block on stdin for `yes`.
5. **Enrich** — chunk into ≤100 contacts per FullEnrich bulk request with `enrich_fields: ["contact.work_emails", "contact.phones"]`.
6. **Receive callbacks** — webhook payloads land within ~30s per batch.
7. **Write outputs** — `qualified-engagers.csv` (passed ICP + enriched) and `qualified-engagers-disqualified.csv` (failed ICP, kept for inspection).

## CLI Reference

```
# URL mode
node scripts/run.mjs <linkedin-post-url-or-post-id> [flags]

# CSV mode
node scripts/run.mjs --csv path/to/leads.csv [flags]

Flags (shared):
    [--out path.csv]           # default qualified-engagers.csv
    [--icp config/icp.json]    # ICP rules file
    [--threshold 50]           # ICP minimum score (0-100)
    [--max <N>]                # URL mode: page cap. CSV mode: hard row cap. (default 500)
    [--max-credits <N>]        # hard credit ceiling (default 500)
    [--dry-run]                # filter + cost preview, no spending
    [--yes | -y]               # skip the interactive approval prompt
```

## CSV column conventions

The parser accepts the most common header naming conventions case-insensitively. For each contact field, the first matching header wins:

| Internal field | Accepted CSV headers |
|---|---|
| `first_name` | `first_name`, `firstname`, `first name`, `given_name` (or split from `name` / `full_name`) |
| `last_name`  | `last_name`, `lastname`, `last name`, `surname`, `family_name` (or split from `name` / `full_name`) |
| `linkedin_url` | `linkedin_url`, `linkedin`, `profile_url`, `linkedin profile`, `linkedin_profile_url` |
| `title` | `title`, `job_title`, `headline`, `position`, `current_position` |
| `company_name` | `company`, `company_name`, `current_company`, `organization`, `employer` |
| `domain` | `domain`, `company_domain`, `website` |

See `examples/sample-leads.csv` for a minimal working CSV.

## Reference

- Shared API client: `./scripts/lib/fullenrich-client.mjs`
- Shared webhook receiver: `./scripts/lib/fullenrich-webhook.mjs`
- Shared CSV writer: `./scripts/lib/csv.mjs`
- ICP config: `config/icp.json` (editable per use case)
- FullEnrich v2 docs: `https://docs.fullenrich.com/llms.txt`
