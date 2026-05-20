---
name: bug
description: File a lean bug report as a ticket on the Yalc Build Management → Task Board kanban in Notion when the user is blocked by an issue and needs the engineer to fix it. Walks the user through 3 short prompts (what's broken, what they did, what they need but can't get), synthesises a clean repro from their answers, auto-captures repo/branch/commit/OS/Node, then creates the page with type=bug, Assign=Farahi, Status=Not started. Use when the user says "/bug", "file a bug", "report a bug", "I'm blocked", "this is broken — please log it", or any variant of "raise a ticket for this issue".
---

# Bug (zero-friction bug filing for David)

David doesn't want to context-switch into Notion when he hits a blocker. This skill is the single button that converts "this thing is broken" into a clean ticket on the Yalc Build Management → **Task Board** kanban, assigned to Farahi, with everything he needs to fix it.

David also doesn't necessarily know how to write "steps to reproduce." The skill asks 3 plain-language questions and *synthesises* the repro itself.

## When this skill applies

- "/bug" / "file a bug" / "log a bug"
- "this is broken — please report it"
- "I'm blocked, raise a ticket for Farahi"
- "open a bug for <X>"

**Not this skill:**
- "fix this for me" → debug in-chat, do NOT file a ticket.
- "feature request" / "I want to add X" → the board has a `feature` type; this skill is bug-only. If the user clearly wants a feature, say so and stop.
- "I want to discuss a build idea" → that's the existing manual flow on the Build Management page; this skill only files bugs.

## Inputs

The user may invoke the skill with a one-line note (`/bug the campaign dashboard is empty`) or with nothing. Either way, run the interview below — the note seeds the first answer.

## Procedure

### 1. Three-question interview

Ask all three questions in a single message so the user can answer in one go:

> 1. **What's the issue?** (one line — what isn't working)
> 2. **What were you doing when it happened?** (what command did you run, what page were you on, what did you click)
> 3. **What did you expect, and what happened instead?** (or: "what do you need but can't get")

If the user pre-supplied a note in the slash invocation, use it as a draft for Q1 and only ask the user to fill in Q2 and Q3 (don't make them repeat themselves).

Keep it conversational — never demand "steps to reproduce" in those words; users hate that phrasing.

### 2. Auto-capture environment

While the user is typing, capture the environment **in parallel** (no user effort):

- `git rev-parse --show-toplevel` → repo path → derive repo name from the basename
- `git rev-parse --abbrev-ref HEAD` → current branch
- `git rev-parse --short HEAD` → latest commit SHA
- `git status -sb` → dirty files (just the count, not contents — secrets risk)
- `uname -srm` → OS / kernel / arch
- `node -v` → Node version (skip silently if not installed)

Mask anything that smells like a secret. If `git status -sb` reveals a path like `.env*`, don't include the filename in the ticket.

### 3. Synthesise the ticket

Compose four sections from the user's three answers + auto-captured env:

**Title** (auto, ≤80 chars): a scannable summary derived from Q1. Bug voice — present tense, no "I", no "we". Examples:
- ✅ `Campaign dashboard renders empty after import-heyreach`
- ✅ `qualify-leads gate crashes on missing ICP for datascalehr tenant`
- ❌ `David's bug`
- ❌ `something is broken with the dashboard`

**Description** — one paragraph (2–4 sentences) restating Q1 in clean prose so Farahi can grok it in 10 seconds.

**Steps to reproduce** — numbered list synthesised from Q2. Turn the user's narrative ("I ran the campaign sync then opened the dashboard") into discrete steps:
1. Run `npx tsx src/cli/index.ts campaign:import-heyreach --sender-account-id 160491`
2. Open the dashboard via `/campaign-dashboard`
3. …

If the user's Q2 is genuinely too vague to derive 2+ steps from, write one step plus a `(reporter wasn't sure of the exact sequence — please verify)` note. Don't fabricate steps.

**Expected vs Actual** — two short bullets, derived from Q3:
- **Expected:** …
- **Actual:** …

**Environment** — small fenced block at the bottom:
```
Repo:    yalc-internal
Branch:  david/workspace
Commit:  1bc66e5
Status:  3 modified, 14 untracked
OS:      Darwin 24.0.0 arm64
Node:    v20.11.1
Reporter: David Small
Filed:   2026-05-19
```

### 4. Show David the draft before filing

Render the ticket in chat — title + the four body sections — and ask: **"Looks good? I'll file it to Notion."** Accept "yes" / "ship it" / "go" / "lgtm" or any tweak the user provides. If he tweaks, regenerate and re-confirm once.

Keep this preview tight — no fluff, no emojis, just the content.

### 5. File the page

Call the Notion MCP `notion-create-pages` tool with:

- `parent`: `{"data_source_id": "35aa610e-44bc-80f1-bd2d-000bef6cb1b8"}` (the Task Board data source)
- `pages`: array of one page with:
  - `properties.Name` = the synthesised title
  - `properties.type` = `"bug"`
  - `properties.Assign` = `["4463bee5-54ba-44b3-b8b5-7d1df0d50227"]` (Farahi's user ID — confirmed from existing assigned cards on the board)
  - `properties.Status` = `"Not started"`
  - `content` (markdown) = the body in this order:
    ```
    ## Description
    <description paragraph>

    ## Steps to reproduce
    1. <step 1>
    2. <step 2>
    ...

    ## Expected vs Actual
    - **Expected:** <expected>
    - **Actual:** <actual>

    ## Environment
    ```
    Repo:    ...
    Branch:  ...
    ...
    ```
    ```

### 6. Report

Show David:
- ✅ `Filed bug → <Notion page URL>`
- One-liner: `Assigned to Farahi · Status: Not started · type: bug`
- No follow-up offer needed — the ticket is the deliverable.

## Hard rules

1. **Always `type = bug`, always `Status = Not started`, always `Assign = Farahi`.** This skill is bug-only — never wire it up to file features or skills (the board's other two types). If the user clearly wants a feature, say so and stop.
2. **Never make David write "steps to reproduce" verbatim.** Ask in his language ("what were you doing"), synthesise the repro yourself.
3. **Never include secret-shaped strings in the ticket body.** If a path or env var name looks sensitive (`.env*`, `*token*`, `*key*`, `*credential*`), reference it generically ("an env file") instead of by name.
4. **Always show the draft before filing.** One round of edits, then ship. Don't ping-pong.
5. **Always include the Environment block.** Farahi has repeatedly needed branch + commit context — never skip it.
6. **One ticket per `/bug` invocation.** If the user describes two distinct bugs, file the first and offer to run `/bug` again for the second.
7. **Never assign to anyone other than Farahi from this skill.** If a different assignee is needed, that's a different flow.
8. **Never auto-merge / close / reopen tickets.** This skill creates; it doesn't manage state.

## Failure modes to handle gracefully

- **Notion MCP unavailable / auth failed** → tell David, show him the drafted ticket as markdown so he can paste it into Notion manually. Don't lose his work.
- **User answers Q1 only and stops** → don't file with a half-baked repro. Ask Q2 and Q3 again once; if still nothing, file with what you have and add `(reporter only had time for a quick note — please follow up)` at the top of the Description.
- **`git` commands fail (not in a repo)** → still file the ticket. Replace the Environment block with `Repo:    (not in a git repo — filed from <cwd>)`.
- **The "feature" mismatch** → if the user says "I want X to also do Y", flag: "That sounds like a feature request, not a bug. Want me to file it as a feature instead, or skip?" Don't silently file a feature as a bug.

## Reference data (do not change without re-checking the board)

- **Database:** Task Board (URL: https://www.notion.so/35aa610e44bc80ab893dcaca391db93f)
- **Data source ID:** `35aa610e-44bc-80f1-bd2d-000bef6cb1b8`
- **Parent page:** Yalc: Build Management (https://www.notion.so/Yalc-Build-Management-358a610e44bc80d4a0bdc3c4f2c7065e)
- **Farahi's Notion user ID:** `4463bee5-54ba-44b3-b8b5-7d1df0d50227`
- **Schema:**
  - `Name` (title)
  - `Status` (status) — options: `Not started`, `In progress`, `Done`
  - `type` (select) — options: `skill`, `feature`, `bug`
  - `Assign` (person) — array of user IDs
