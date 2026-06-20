import { loadCommandCenter, WAVE_ACCENTS } from "@/lib/loadCommandCenter";
import type { AssessedTicket } from "@/lib/risk";
import Tabs from "../Tabs";

export const revalidate = 60;
export const metadata = { title: "Owners — Launch Command Center" };

function dueTxt(t: AssessedTicket): { txt: string; red: boolean } {
  if (t.daysToDue === null) return { txt: "—", red: false };
  if (t.daysToDue < 0) return { txt: `−${Math.abs(t.daysToDue)}d`, red: true };
  if (t.daysToDue === 0) return { txt: "today", red: true };
  return { txt: `${t.daysToDue}d`, red: false };
}
function stCls(c: AssessedTicket["statusCategory"]) {
  return c === "done" ? "stt done" : c === "indeterminate" ? "stt prog" : "stt new";
}

type Row = { t: AssessedTicket; waveN: number; accent: string };

export default async function OwnersPage() {
  const { assessments } = await loadCommandCenter();
  // Active (not-done) tickets only — this is a workload view.
  const rows: Row[] = assessments.flatMap((a, wi) =>
    a.tickets
      .filter((t) => !t.isDone)
      .map((t) => ({ t, waveN: wi + 1, accent: WAVE_ACCENTS[wi % WAVE_ACCENTS.length] }))
  );

  const byOwner = new Map<string, Row[]>();
  for (const r of rows) {
    const o = r.t.assignee ?? "Unassigned";
    if (!byOwner.has(o)) byOwner.set(o, []);
    byOwner.get(o)!.push(r);
  }
  const owners = Array.from(byOwner.entries()).map(([name, items]) => {
    const atRisk = items.filter((r) => r.t.severity === "overdue" || r.t.severity === "due-soon").length;
    const pts = items.reduce((s, r) => s + (r.t.storyPoints ?? 0), 0);
    const inProg = items.filter((r) => r.t.statusCategory === "indeterminate").length;
    items.sort((a, b) => {
      const sev = (r: Row) => (r.t.severity === "overdue" ? 0 : r.t.severity === "due-soon" ? 1 : 2);
      return sev(a) - sev(b) || a.waveN - b.waveN;
    });
    return { name, items, atRisk, pts, inProg, unassigned: name === "Unassigned" };
  });
  owners.sort((a, b) => b.atRisk - a.atRisk || b.items.length - a.items.length);

  return (
    <div className="cc">
      <div className="top"><span>Gong Engage &amp; Forecast — Implementation</span><span className="live">Owners &amp; workload · live</span></div>
      <Tabs />
      <div className="subhead"><h1>Owners &amp; Teams</h1><p>Every active (not-done) ticket by assignee — busiest and most at-risk first.</p></div>

      {owners.map((o) => (
        <div className="ownercard" key={o.name}>
          <div className="ochd">
            <span className={`oname${o.unassigned ? " unassigned" : ""}`}>{o.name}</span>
            <div className="ostats">
              <span><b>{o.items.length}</b> open</span>
              <span><b>{o.inProg}</b> in progress</span>
              <span><b>{o.pts}</b> pts</span>
              {o.atRisk > 0 && <span className="oat">⚠ {o.atRisk} at risk</span>}
            </div>
          </div>
          <div className="sbrows">
            {o.items.map(({ t, waveN, accent }) => {
              const du = dueTxt(t);
              return (
                <div className="sbrow" key={t.key}>
                  <span className="tk">{t.key}</span>
                  <span className="wvchip" style={{ color: accent, borderColor: accent }}>W{waveN}</span>
                  <a className="ts" href={t.url} target="_blank" rel="noopener noreferrer">{t.summary}</a>
                  <span className={stCls(t.statusCategory)}>{t.status}</span>
                  <span className="ta">{t.sprint ? t.sprint.name.match(/S\d+/)?.[0] ?? "—" : "no sprint"}</span>
                  <span className="td" style={du.red ? { color: "var(--red)" } : undefined}>{du.txt}</span>
                  <span className="tp">{t.storyPoints != null ? t.storyPoints : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
