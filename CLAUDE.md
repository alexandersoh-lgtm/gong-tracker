# Gong Tracker — Prompt Guide for Claude

This file tells Claude how this project works and what common update tasks look like.

## Project Structure

- `data/*.json` — all content lives here. Edit these to update the site.
- `data/workstreams.json` — 4 workstreams: genesys-dialer, gong-engage, gong-forecast, pmo
- `data/program.json` — top-level program info (name, status, dates, summary)
- `data/pmo.json` — program-level risks, decisions, action items
- `data/launches.json` — launch tracker phases and group statuses
- `app/` — Next.js pages (rarely need editing)
- `lib/computed.ts` — auto-computed values (percentComplete, blockers, etc.)

## What is Auto-Computed (never edit manually)

- **percentComplete** on workstream cards → computed from milestone statuses
- **Open Blockers count** on dashboard → counted from all workstream blockers
- **Open Actions count** → combined from pmo.json + all workstream actions
- **Next Go-Live** → finds nearest upcoming go-live/launch/pilot milestone
- ~~keyStats in program.json~~ → removed, all computed live

## Common Update Prompts

### Calendar sync
> "Sync calendar" or "Refresh my meetings"
Full sync — does all of the following in one pass:
1. Pull upcoming meetings from Glean → update upcoming section with attendees + goals/decision points
2. Pull past meetings from Glean → identify new ones not yet in the workstream
3. Search ~/Downloads/Zoom Transcripts for matching transcript files → extract decisions + action items
4. Check Glean for Zoom AI meeting summary emails → extract decisions + action items
5. Prepend key takeaways to the Updates section for the most recent meeting
6. If no transcript/summary found → adds meeting shell (title, date, attendees, calendar link) with blank decisions for manual fill-in

### Update a workstream status
> "Update Genesys Dialer status to yellow"
→ Edit `status` field in workstreams.json for that workstream

### Mark a milestone complete
> "Mark UAT as complete for Genesys Dialer"
→ Find milestone in workstreams.json, change `status` to "complete"

### Add a blocker
> "Add a blocker to Gong Forecast: [description], owner: [name]"
→ Append to blockers array in workstreams.json

### Resolve a blocker
> "Remove the SF hygiene blocker from Gong Forecast"
→ Delete the blocker entry from workstreams.json

### Add an update
> "Add update to Gong Engage: [text]"
→ Prepend to updates array with today's date in workstreams.json

### Update program status
> "Set overall program status to yellow"
→ Edit `status` in program.json

### Add a past meeting
> "Add meeting: [title], [date], [attendees], decisions: [...], actions: [...]"
→ Append to past meetings array for the relevant workstream

### Update action item status
> "Mark action [title] as complete in PMO"
→ Find action in pmo.json or workstreams.json, set status to "complete"

### Add a risk to PMO
> "Add risk: [title], likelihood: high, impact: medium, owner: [name]"
→ Append to risks array in pmo.json

### Update launch phase
> "Mark ASA Wave 1 Kickoff as complete in Launch Tracker"
→ Find group in launches.json, set phase value to "complete"

## Workstream IDs
- `genesys-dialer` — Unified Genesys Dialer
- `gong-engage` — Gong Engage Implementation
- `gong-forecast` — Gong Forecast Implementation
- `pmo` — Overall PMO

## Milestone Status Values
- `complete` — done
- `in_progress` — currently active
- `not_started` — future

## Phase Status Values (Launch Tracker)
- `complete`, `in_progress`, `not_started`, `na`

## After any data change
Always run: `git add -A && git commit -m "[description]" && git push`
Vercel auto-deploys on every push. Live in ~90 seconds.

## Launch Command Center (`/command-center`)

Live launch-readiness page. Two data sources, kept strictly separate:
- **LIVE from Jira (never hand-edit):** all tickets, statuses, assignees, due dates, **sprints**, the at-risk engine, readiness %, counts. Pulled in `lib/jira.ts` via `JIRA_*` env vars; matched to waves/LOBs by labels (`cc-wave1/2/3`, `cc-lob-*`) + Jira components.
- **MANUAL in `data/command-center.json`:** wave list + go-live dates, LOB list (seats/owner/scope), and each LOB's **go-live milestone statuses** (Discovery · Configuration · Template Tagging · SalesLoft Migration · Training · UAT · Go-Live → `complete` | `in_progress` | `not_started`). Milestones have NO Jira source.

### Prompt: "Sync the command center from the plan doc"
Source: **Gong Engage & Forecast Implementation Plan** — https://docs.google.com/document/d/1VxCf0w1pcNOVeslsPjg3c2CdBNmGM26mWATWCAd59TI/edit
1. Read the doc (Glean `read_document`).
2. Update `data/command-center.json` **only where the doc is unambiguous**: wave `goLive` dates, LOB seats/owners/scope. The doc is prose + has internally inconsistent tables — when tables conflict, **flag it to Alexander** and prefer his confirmed model (3 waves: ZGMI/Mortech Jul 13 · ASA Jul 20 · NewCon/StreetEasy/Preferred/dotloop/ShowingTime Aug 3 · Rentals excluded · SalesLoft off-board Aug 26).
3. **Milestone statuses:** parse ONLY from a "Per-LOB Go-Live Milestones" table in the doc (format below). If that table is absent, do NOT fabricate statuses — leave them and tell Alexander to add it.
4. Never modify ticket data (it's live). Then commit + push.

Milestone table to maintain in the doc (one row per LOB; cells = `complete`/`in_progress`/`not_started`):

| LOB | Discovery | Configuration | Template Tagging | SalesLoft Migration | Training | UAT | Go-Live |
|-----|-----------|---------------|------------------|---------------------|----------|-----|---------|
| ZGMI / Mortech | complete | complete | in_progress | not_started | not_started | not_started | not_started |
| ASA | … | … | … | … | … | … | … |
| New Construction | … | … | … | … | … | … | … |
| StreetEasy | … | … | … | … | … | … | … |
| Preferred | … | … | … | … | … | … | … |
| dotloop | … | … | … | … | … | … | … |
| ShowingTime | … | … | … | … | … | … | … |
