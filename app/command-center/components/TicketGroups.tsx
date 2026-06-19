import type { AssessedTicket } from "@/lib/risk";

function stClass(cat: AssessedTicket["statusCategory"]): string {
  return cat === "done" ? "stt done" : cat === "indeterminate" ? "stt prog" : "stt new";
}
function ticketDue(t: AssessedTicket): { txt: string; red: boolean } {
  if (t.daysToDue === null) return { txt: "—", red: false };
  if (t.daysToDue < 0) return { txt: `−${Math.abs(t.daysToDue)}d`, red: true };
  if (t.daysToDue === 0) return { txt: "today", red: true };
  return { txt: `${t.daysToDue}d`, red: false };
}

// Renders a list of tickets grouped by Jira sprint ("Sprint N"), chronologically,
// with per-sprint story-point totals. Reused for each LOB and the unassigned bucket.
export default function TicketGroups({ tickets }: { tickets: AssessedTicket[] }) {
  const groups: { name: string; label: string; range: string | null; isBacklog: boolean; items: AssessedTicket[] }[] = [];
  const gidx = new Map<string, number>();
  for (const t of tickets) {
    const key = t.sprint?.name ?? "__backlog__";
    if (!gidx.has(key)) {
      gidx.set(key, groups.length);
      const m = t.sprint?.name.match(/S(\d+)(?:_|$)/);
      groups.push({
        name: t.sprint?.name ?? "",
        label: t.sprint ? (m ? `Sprint ${parseInt(m[1], 10)}` : t.sprint.name) : "Backlog · no sprint",
        range: t.sprint?.range ?? null,
        isBacklog: !t.sprint,
        items: [],
      });
    }
    groups[gidx.get(key)!].items.push(t);
  }
  groups.sort((x, y) => (x.isBacklog !== y.isBacklog ? (x.isBacklog ? 1 : -1) : x.name.localeCompare(y.name)));

  return (
    <div className="ltix">
      {groups.map((g) => {
        const gpts = g.items.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
        return (
          <div className="sprintgrp" key={g.label}>
            <div className="sh">
              <span className="sn">{g.label}</span>
              <span className="sd">{g.isBacklog ? "" : g.name}{g.range ? ` · ${g.range}` : ""}</span>
              <span className="sbar" />
              {gpts > 0 && <span className="pts">{gpts} pts</span>}
            </div>
            {g.items.map((t) => {
              const du = ticketDue(t);
              return (
                <div className="trow" key={t.key}>
                  <span className="tk">{t.key}</span>
                  <a className="ts" href={t.url} target="_blank" rel="noopener noreferrer">{t.summary}</a>
                  <span className={stClass(t.statusCategory)}>{t.status}</span>
                  <span className="ta">{t.assignee ?? "—"}</span>
                  <span className="td" style={du.red ? { color: "var(--red)" } : undefined}>{du.txt}</span>
                  <span className="tp">{t.storyPoints != null ? t.storyPoints : "—"}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
