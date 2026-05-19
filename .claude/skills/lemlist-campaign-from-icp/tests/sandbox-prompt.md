# Sandbox prompt for QA happy-path

Paste this prompt verbatim into Claude Code after the standalone install is set up (see `README.md` phase 2).

```
Create a lemlist campaign for VPs of Sales at Series B SaaS companies in
Europe that are hiring Account Executives. Our product helps RevOps teams
cut quota ramp time from 6 months to 3. 5 leads only (sandbox run),
paused. Do NOT enable any per-lead enrichment flags. Campaign name should
include "QA-{today}" so I can find it.
```

Notes:
- 5 leads, not 50 — keep credit burn negligible
- "Do NOT enable any per-lead enrichment flags" is explicit by design — Bug 4 test
- "QA-{today}" tag makes the campaign findable in the lemlist UI without scrolling
- Replace `{today}` with `YYYY-MM-DD` before pasting
