import { loadCommandCenter, WAVE_ACCENTS, ccConfig, fmtDate } from "@/lib/loadCommandCenter";
import { lobMatches, type AssessedTicket } from "@/lib/risk";
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

type Row = { t: AssessedTicket; waveN: number; waveName: string; accent: string; lob: string };

export default async function SprintsPage() {
  const { assessments } = await loadCommandCenter();
  const rows: Row[] = assessments.flatMap((a, wi) => {
    const lobs = a.wave.lobs ?? [];
    return a.tickets.map((t) => {
      const matched = lobs.filter((l) => lobMatches(t, l)).map((l) => l.name);
      return {
        t,
        waveN: wi + 1,
        waveName: a.wave.name.split(" — ")[0],
        accent: WAVE_ACCENTS[wi % WAVE_ACCENTS.length],
        lob: matched.length ? matched.join(" / ") : "—",
      };
    });
  });

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
      placeholder: false as boolean,
    };
  });
  list.sort((a, b) =>
    a.isBacklog !== b.isBacklog ? (a.isBacklog ? 1 : -1) : a.active !== b.active ? (a.active ? -1 : 1) : a.name.localeCompare(b.name)
  );

  // Planned sprints from config that have no tickets yet → placeholder cards (S15/S16)
  const sprintDefs = (ccConfig as { sprints?: { name: string; start: string; end: string }[] }).sprints ?? [];
  const present = new Set(list.map((g) => g.label));
  const placeholders = sprintDefs
    .filter((s) => !present.has(s.name))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((s) => ({
      name: s.name, label: s.name, isBacklog: false, active: false, placeholder: true as boolean,
      range: `${fmtDate(s.start)} – ${fmtDate(s.end)}`,
      items: [] as Row[], total: 0, done: 0, pts: 0, ptsDone: 0, atRisk: 0,
    }));
  const dated = list.filter((g) => !g.isBacklog);
  const backlog = list.filter((g) => g.isBacklog);
  const ordered = [...dated, ...placeholders, ...backlog];

  return (
    <div className="cc">
      <div className="top"><span>Gong Engage &amp; Forecast — Implementation</span><span className="live">Sprint board · live</span></div>
      <Tabs />
      <div className="subhead"><h1>Sprint Board</h1><p>Every tracked ticket grouped by Jira sprint — active sprint first.</p></div>

      {ordered.map((g) => {
        if (g.placeholder) {
          return (
            <div className="spcard placeholder" key={g.label}>
              <div className="sphd">
                <div className="sphd-l">
                  <span className="spname">{g.label}</span>
                  <span className="spplanned">PLANNED</span>
                  <span className="sprange">{g.range}</span>
                </div>
                <div className="spstats">no tickets yet</div>
              </div>
            </div>
          );
        }
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
              {g.items.map(({ t, waveN, accent, lob }) => {
                const du = dueTxt(t);
                return (
                  <div className="sbrow spw" key={t.key}>
                    <span className="tk">{t.key}</span>
                    <span className="wvchip" style={{ color: accent, borderColor: accent }}>W{waveN}</span>
                    <span className="lobcell" title={lob}>{lob}</span>
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
