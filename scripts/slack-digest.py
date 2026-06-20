#!/usr/bin/env python3
"""Generate the Gong Engage & Forecast launch Slack digest from live Jira.
Reads creds from gong-tracker/.env.local and structure from data/command-center.json.
Prints the Slack-ready message (** bold) to stdout. Used by the weekday 8am digest job.
"""
import json, urllib.request, base64, datetime, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, "data/command-center.json")))
C = cfg["config"]

# load .env.local
env = {}
for line in open(os.path.join(ROOT, ".env.local")):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); env[k] = v
BASE = env["JIRA_BASE_URL"].rstrip("/"); EMAIL = env["JIRA_EMAIL"]; TOKEN = env["JIRA_API_TOKEN"]
auth = base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()

today = datetime.date.today()
dueSoon = C.get("dueSoonDays", 10)
excl = set(s.lower() for s in C.get("excludeStatuses", []))

def jql(q, fields):
    out = []; token = None
    while True:
        body = {"jql": q, "fields": fields, "maxResults": 100}
        if token: body["nextPageToken"] = token
        req = urllib.request.Request(f"{BASE}/rest/api/3/search/jql", data=json.dumps(body).encode(),
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json", "Accept": "application/json"})
        d = json.load(urllib.request.urlopen(req))
        out += d.get("issues", [])
        if d.get("isLast") or not d.get("nextPageToken") or len(out) > 300: break
        token = d["nextPageToken"]
    return out

def sel(v): return (v.get("value") or v.get("name")) if isinstance(v, dict) else None
def days(d): return (datetime.date.fromisoformat(d) - today).days

FIELDS = ["status", "duedate", "assignee", "summary", "customfield_11670", "customfield_17773", "customfield_20868", "customfield_19801"]
EMOJI = {1: "🔵", 2: "🟣", 3: "🟢"}
lines = []; atrisk = []; clean = {"No sprint": 0, "No Team": 0, "No FET Team": 0, "Product≠Key Init": 0}

for w in cfg["waves"]:
    m = re.search(r"wave(\d)", w["id"]); label = int(m.group(1)) if m else "?"
    gl = w["goLive"]; gdays = days(gl)
    issues = [i for i in jql(w["jql"], FIELDS) if i["fields"]["status"]["name"].lower() not in excl]
    total = len(issues); done = 0; overdue = 0; duesoon = 0
    for i in issues:
        f = i["fields"]
        if f["status"]["statusCategory"]["key"] == "done": done += 1; continue
        dd = f.get("duedate"); ddx = days(dd) if dd else None
        if (ddx is not None and ddx < 0) or gdays < 0:
            overdue += 1; atrisk.append(("overdue", ddx if ddx is not None else gdays, i["key"], f["summary"][:48], f"Wave {label}", f"overdue {abs(ddx)}d" if ddx is not None else "past go-live"))
        elif (ddx is not None and ddx <= dueSoon) or (ddx is None and gdays <= dueSoon):
            duesoon += 1; atrisk.append(("due-soon", ddx if ddx is not None else gdays, i["key"], f["summary"][:48], f"Wave {label}", f"due in {ddx}d" if ddx is not None else "due soon"))
        else:
            if not f.get("customfield_11670"): clean["No sprint"] += 1
            if not sel(f.get("customfield_17773")): clean["No Team"] += 1
            if not sel(f.get("customfield_20868")): clean["No FET Team"] += 1
            if (sel(f.get("customfield_19801")) or "").strip() != "Key Initiatives": clean["Product≠Key Init"] += 1
    md = sum(1 for l in w.get("lobs", []) for ms in l["milestones"] if ms["status"] == "complete")
    ma = sum(1 for l in w.get("lobs", []) for ms in l["milestones"] if ms["status"] != "na")
    rates = ([md / ma] if ma else []) + ([done / total] if total else [])
    rd = round(sum(rates) / len(rates) * 100) if rates else 0
    go = overdue == 0 and (ma - md) == 0
    cd = f"T‑{gdays}d" if gdays >= 0 else f"{abs(gdays)}d ago"
    nm = w["name"].split(" — ")[1] if " — " in w["name"] else w["name"]
    lines.append(f"{EMOJI.get(label, '•')} **Wave {label} · {nm}** — {cd} ({datetime.date.fromisoformat(gl).strftime('%b %-d')}) — {'✅ GO' if go else '🚦 NO-GO'} · {rd}% ready · {overdue + duesoon} at risk")

um = jql(f"parent in ({','.join(C['gongEpics'])}) AND (labels is EMPTY OR labels not in (cc-wave1,cc-wave2,cc-wave3)) AND issuetype != Epic", ["key"])
atrisk.sort(key=lambda x: (0 if x[0] == "overdue" else 1, x[1]))

out = [f"**🚀 Gong Engage & Forecast — Launch Digest** · {today.strftime('%a %b %-d')}", ""]
out += lines + [""]
if atrisk:
    out.append(f"**⚠ At risk — {len(atrisk)}**")
    for s, _, k, summ, wv, delta in atrisk[:6]:
        out.append(f"• `{k}` {summ} — {wv} · {delta}")
    if len(atrisk) > 6: out.append(f"…+{len(atrisk) - 6} more")
else:
    out.append("**⚠ At risk:** none — nothing threatening a date 🎉")
out += ["", f"**🧹 Needs cleanup:** {clean['No sprint']} no sprint · {clean['No Team']} no Team · {clean['No FET Team']} no FET · {clean['Product≠Key Init']} Product≠Key Initiatives",
        f"**🔍 Coverage:** {len(um)} ticket(s) in the Gong epics not mapped to a wave", "",
        "→ https://gong-tracker-alexandersoh-lgtms-projects.vercel.app/command-center"]
sys.stdout.write("\n".join(out))
