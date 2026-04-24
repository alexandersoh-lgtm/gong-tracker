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
