import { loadCommandCenter, WAVE_ACCENTS } from "@/lib/loadCommandCenter";
import type { AssessedTicket } from "@/lib/risk";
import Tabs from "../Tabs";

export const revalidate = 60;
export const metadata = { title: "Sprints — Launch Command Center" };

function sprintLabel(name: string): string {
  const m = name.match(/S(\d+)(?:_|$)/);
  return m ? `Sprint ${parseInt(m[1], 10)}` : name;
}
function dueTxt(t: AssessedTicket): { txt: string; red: boolean } {
  if (t.daysToDue === null) return { txt: "—", red: false };
  if (t.daysToDue < 0) return { txt: `−${Math.abs(t.daysToDue)}d`, red: true };
  if (t.daysToDue === 0) return { txt: "today", red: true };
  return { txt: `${t.daysToDue}d`, red: false };
}
function stCls(c: AssessedTicket["statusCategory"]) {
  return c === "done" ? "stt done" : c === "indeterminate" ? "stt prog" : "stt new";
}

type Row = { t: AssessedTicket; waveN: number; waveName: string; accent: string };

export default async function SprintsPage() {
  const { assessments } = await loadCommandCenter();
  const rows: Row[] = assessments.flatMap((a, wi) =>
    a.tickets.map((t) => ({
      t,
      waveN: wi + 1,
      waveName: a.wave.name.split(" — ")[0],
      accent: WAVE_ACCENTS[wi % WAVE_ACCENTS.length],
    }))
  );

  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.t.sprint?.name ?? "__backlog__";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const list = Array.from(groups.entries()).map(([name, items]) => {
    const sample = items.find((r) => r.t.sprint)?.t.sprint ?? null;
    const isBacklog = name === "__backlog__";
    const total = items.length;
    const done = items.filter((r) => r.t.isDone).length;
    const pts = items.reduce((s, r) => s + (r.t.storyPoints ?? 0), 0);
    const ptsDone = items.filter((r) => r.t.isDone).reduce((s, r) => s + (r.t.storyPoints ?? 0), 0);
    const atRisk = items.filter((r) => r.t.severity === "overdue" || r.t.severity === "due-soon").length;
    items.sort((a, b) => a.waveN - b.waveN || a.t.key.localeCompare(b.t.key));
    return {
      name, isBacklog, items, total, done, pts, ptsDone, atRisk,
      label: isBacklog ? "Backlog · no sprint" : sprintLabel(name),
      range: sample?.range ?? null,
      active: sample?.state === "active",
    };
  });
  list.sort((a, b) =>
    a.isBacklog !== b.isBacklog ? (a.isBacklog ? 1 : -1) : a.active !== b.active ? (a.active ? -1 : 1) : a.name.localeCompare(b.name)
  );

  return (
    <div className="cc">
      <div className="top"><span>Gong Engage &amp; Forecast — Implementation</span><span className="live">Sprint board · live</span></div>
      <Tabs />
      <div className="subhead"><h1>Sprint Board</h1><p>Every tracked ticket grouped by Jira sprint — active sprint first.</p></div>

      {list.map((g) => {
        const pct = g.pts > 0 ? Math.round((g.ptsDone / g.pts) * 100) : g.total ? Math.round((g.done / g.total) * 100) : 0;
        return (
          <div className="spcard" key={g.label}>
            <div className="sphd">
              <div className="sphd-l">
                <span className="spname">{g.label}</span>
                {g.active && <span className="spactive">ACTIVE</span>}
                {g.range && <span className="sprange">{g.range}</span>}
              </div>
              <div className="spstats">
                <span>{g.done}/{g.total} done</span>
                <span>{g.ptsDone}/{g.pts} pts</span>
                {g.atRisk > 0 && <span className="spat">⚠ {g.atRisk} at risk</span>}
                <span className="sppct">{pct}%</span>
              </div>
            </div>
            <div className="spbar"><i style={{ width: `${pct}%` }} /></div>
            <div className="sbrows">
              {g.items.map(({ t, waveN, accent }) => {
                const du = dueTxt(t);
                return (
                  <div className="sbrow" key={t.key}>
                    <span className="tk">{t.key}</span>
                    <span className="wvchip" style={{ color: accent, borderColor: accent }}>W{waveN}</span>
                    <a className="ts" href={t.url} target="_blank" rel="noopener noreferrer">{t.summary}</a>
                    <span className={stCls(t.statusCategory)}>{t.status}</span>
                    <span className="ta">{t.assignee ?? "—"}</span>
                    <span className="td" style={du.red ? { color: "var(--red)" } : undefined}>{du.txt}</span>
                    <span className="tp">{t.storyPoints != null ? t.storyPoints : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
