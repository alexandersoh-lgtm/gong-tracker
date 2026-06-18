import ccData from "@/data/command-center.json";
import { searchJira, jiraConfigured } from "@/lib/jira";
import {
  assessWave,
  lobMatches,
  milestonesDone,
  milestonesApplicable,
  type WaveConfig,
  type WaveAssessment,
  type AssessedTicket,
  type Lob,
  type RiskThresholds,
} from "@/lib/risk";
import MilestoneStepper from "./components/MilestoneStepper";

export const revalidate = 60;
export const metadata = { title: "Launch Command Center — Gong Engage & Forecast" };

const thresholds: RiskThresholds = {
  dueSoonDays: ccData.config.dueSoonDays,
  stalledDays: ccData.config.stalledDays,
};
const BASE = process.env.JIRA_BASE_URL?.replace(/\/$/, "") ?? "";
const PID = ccData.config.jiraProjectId;

const jiraCreateUrl = () => (BASE ? `${BASE}/secure/CreateIssue!default.jspa?pid=${PID}` : "#");

// Per-wave accent colors (sophisticated: cobalt · violet · teal)
const WAVE_ACCENTS = ["#2347e8", "#7c3aed", "#0d9488"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
function daysTo(iso: string, today: Date): number {
  const a = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const t = new Date(iso);
  return Math.round((Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - a) / 86_400_000);
}
function tMinus(days: number): string {
  return days < 0 ? `${Math.abs(days)}d ago` : `T−${days}d`;
}
function stClass(cat: AssessedTicket["statusCategory"]): string {
  return cat === "done" ? "stt done" : cat === "indeterminate" ? "stt prog" : "stt new";
}
function ticketDue(t: AssessedTicket): { txt: string; red: boolean } {
  if (t.daysToDue === null) return { txt: "—", red: false };
  if (t.daysToDue < 0) return { txt: `−${Math.abs(t.daysToDue)}d`, red: true };
  if (t.daysToDue === 0) return { txt: "today", red: true };
  return { txt: `${t.daysToDue}d`, red: false };
}
function riskAction(t: AssessedTicket): string {
  if (!t.dueDate) return "Set due date";
  if (!t.assignee) return "Assign owner";
  if (t.flags.includes("stalled")) return "Nudge owner";
  return "Open ↗";
}
function riskDelta(t: AssessedTicket): { txt: string; cls: string } {
  if (t.severity === "overdue") return { txt: `Overdue ${t.daysToDue !== null ? Math.abs(t.daysToDue) + "d" : ""}`.trim(), cls: "red" };
  if (t.severity === "due-soon") return { txt: t.daysToDue !== null ? `Due +${t.daysToDue}d` : "Due soon", cls: "orange" };
  if (t.severity === "stalled") return { txt: "Stalled", cls: "slate" };
  return { txt: "Hygiene", cls: "slate" };
}
function dotCls(sev: string): string {
  return sev === "overdue" ? "d-red" : sev === "due-soon" ? "d-orange" : "d-slate";
}

// Blended readiness = average of two completion rates, each weighted equally:
//   milestone rate = complete / applicable (N/A excluded)
//   ticket rate    = done / total
// Whichever dimension exists is included; if both exist they're averaged 50/50.
function blendPct(mDone: number, mApp: number, tDone: number, tTotal: number): number {
  const parts: number[] = [];
  if (mApp > 0) parts.push(mDone / mApp);
  if (tTotal > 0) parts.push(tDone / tTotal);
  if (parts.length === 0) return 0;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}
function waveReadiness(wave: WaveConfig, ticketsDone: number, ticketsTotal: number): number {
  let done = 0;
  let app = 0;
  for (const l of wave.lobs ?? []) {
    done += milestonesDone(l);
    app += milestonesApplicable(l);
  }
  return blendPct(done, app, ticketsDone, ticketsTotal);
}

export default async function CommandCenterPage() {
  const waves = ccData.waves as unknown as WaveConfig[];
  const today = new Date();

  const assessments: WaveAssessment[] = await Promise.all(
    waves.map(async (wave) => assessWave(wave, await searchJira(wave.jql), thresholds, today))
  );

  const configured = jiraConfigured();
  const fetchError = assessments.find((a) => a.error)?.error ?? null;

  // Program readiness = blended milestone + ticket completion across every wave.
  let progDone = 0;
  let progApp = 0;
  for (const a of assessments) for (const l of a.wave.lobs ?? []) {
    progDone += milestonesDone(l);
    progApp += milestonesApplicable(l);
  }
  const progTicketsDone = assessments.reduce((s, a) => s + a.done, 0);
  const progTickets = assessments.reduce((s, a) => s + a.total, 0);
  const overallReadiness = blendPct(progDone, progApp, progTicketsDone, progTickets);
  const totalAtRisk = assessments.reduce((s, a) => s + a.atRisk, 0);

  // LOB ticket grouping (live) + untracked detection
  const lobTickets = (a: WaveAssessment, lob: Lob) => a.tickets.filter((t) => lobMatches(t, lob));
  let untracked = 0;
  let firstUntracked: { name: string; seats?: number } | null = null;
  for (const a of assessments) {
    for (const lob of a.wave.lobs ?? []) {
      if (lobTickets(a, lob).length === 0) {
        untracked++;
        if (!firstUntracked) firstUntracked = { name: lob.name, seats: lob.seats };
      }
    }
  }

  const upcoming = assessments.filter((a) => a.daysToGoLive >= 0).sort((x, y) => x.daysToGoLive - y.daysToGoLive);
  const next = upcoming[0] ?? assessments[0];
  const waveAtRisk = (a: WaveAssessment) =>
    a.atRisk > 0 || (a.wave.lobs ?? []).some((l) => lobTickets(a, l).length === 0);

  // At-risk board
  const atRisk: { t: AssessedTicket; wave: string }[] = [];
  for (const a of assessments)
    for (const t of a.tickets)
      if (t.severity === "overdue" || t.severity === "due-soon") atRisk.push({ t, wave: a.wave.name.split(" — ")[0] });
  atRisk.sort((x, y) => {
    const sev = (f: AssessedTicket) => (f.severity === "overdue" ? 0 : 1);
    if (sev(x.t) !== sev(y.t)) return sev(x.t) - sev(y.t);
    return (x.t.daysToDue ?? x.t.daysToGoLive) - (y.t.daysToDue ?? y.t.daysToGoLive);
  });
  const watch: { wave: string; text: string }[] = [];
  for (const a of assessments) for (const w of a.wave.watchItems ?? []) watch.push({ wave: a.wave.name.split(" — ")[0], text: w });
  const boardCount = atRisk.length + watch.length;

  const offboardDays = daysTo(ccData.config.offboardDate, today);
  const asOf = today.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="cc">
      <div className="top">
        <span>Gong Engage &amp; Forecast — Implementation</span>
        <span className="live">{configured ? `Live · Jira ${ccData.config.jiraProject} · ${asOf}` : "Not connected"}</span>
      </div>

      <div className="head">
        <h1>Launch<br />Command <span>Center</span></h1>
        <div className="readout">
          <div className="lbl">Program readiness</div>
          <div className="big">{overallReadiness}<sup>%</sup></div>
        </div>
      </div>

      <div className="cards">
        {assessments.map((a, i) => {
          const isNext = !!next && a.wave.id === next.wave.id;
          const atRiskWave = waveAtRisk(a);
          const waveSP = a.tickets.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
          const wr = waveReadiness(a.wave, a.done, a.total);
          const accent = WAVE_ACCENTS[i % WAVE_ACCENTS.length];
          return (
            <div className={`wtile${isNext ? " feat" : ""}`} key={a.wave.id} style={{ borderTop: `3px solid ${accent}` }}>
              <div className="te">
                <span className="wbadge" style={{ background: accent }}>Wave {i + 1}</span>
                <span className={`verdict ${atRiskWave ? "risk" : "ok"}`}>{atRiskWave ? "⚠ At risk" : "✓ On track"}</span>
              </div>
              <div className="tn">{a.wave.name.split(" — ")[1] ?? a.wave.name}</div>
              <div className="tdate">{fmtDate(a.wave.goLive)} · {a.wave.scope.join(" + ")}</div>
              <div className="tcd">{tMinus(a.daysToGoLive)}</div>
              <div className="tbar"><i style={{ width: `${wr}%`, backgroundColor: accent }} /></div>
              <div className="tsub">{wr}% ready · {a.total} tickets · {waveSP} pts · {a.atRisk} at risk</div>
            </div>
          );
        })}
      </div>

      <div className="mstrip">
        <div className="m warn"><div className="mk">Needs action</div><div className="mv warnv">{totalAtRisk}</div><div className="mn">tickets at risk of slipping</div></div>
        <div className="m gap"><div className="mk">Untracked LOBs</div><div className="mv gapv">{untracked}</div><div className="mn">{firstUntracked ? `${firstUntracked.name} · no tickets` : "all LOBs have tickets"}</div></div>
        <div className="m wall"><div className="mk">SalesLoft off-board</div><div className="mv wallv">{tMinus(offboardDays)}</div><div className="mn">hard cutover · {fmtDate(ccData.config.offboardDate)}</div></div>
      </div>

      {!configured && (
        <div className="banner"><h3>Connect Jira</h3><p>Set JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN in the environment to populate live data.</p></div>
      )}
      {configured && fetchError && (
        <div className="banner"><h3>Jira fetch error</h3><p className="mono">{fetchError}</p></div>
      )}

      <div className="sec"><span className="idx">01</span><h2>Go-Live Waves &amp; Lines of Business</h2><span className="count">{assessments.length} WAVES · CLICK TO EXPAND</span></div>

      {assessments.map((a, wi) => {
        const waveSP = a.tickets.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
        const wr = waveReadiness(a.wave, a.done, a.total);
        const accent = WAVE_ACCENTS[wi % WAVE_ACCENTS.length];
        return (
          <details className="wave" key={a.wave.id} open={wi === 0}>
            <summary>
              <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
              <div>
                <div className="wname"><span className="wbadge" style={{ background: accent }}>Wave {wi + 1}</span>{a.wave.name.split(" — ")[1] ?? a.wave.name}</div>
                <div className="wmeta">{(a.wave.lobs ?? []).length} LOB{(a.wave.lobs ?? []).length === 1 ? "" : "s"} · {a.total} tickets{waveSP ? ` · ${waveSP} pts` : ""} · {a.atRisk} at risk</div>
              </div>
              <div className="track"><i style={{ width: `${wr}%`, backgroundColor: accent }} /></div>
              <div className="wpct" style={{ color: accent }}>{wr}%</div>
              <div className="wdate">{fmtDate(a.wave.goLive)}<small>{tMinus(a.daysToGoLive)}</small></div>
            </summary>
            <div className="lobs">
              {(a.wave.lobs ?? []).map((lob) => {
                const tix = lobTickets(a, lob);
                const done = milestonesDone(lob);
                const applicable = milestonesApplicable(lob);
                // group this LOB's tickets by sprint (live), labelled "Sprint N" and ordered chronologically
                const groups: { name: string; label: string; range: string | null; isBacklog: boolean; items: AssessedTicket[] }[] = [];
                const gidx = new Map<string, number>();
                for (const t of tix) {
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
                groups.sort((x, y) =>
                  x.isBacklog !== y.isBacklog ? (x.isBacklog ? 1 : -1) : x.name.localeCompare(y.name)
                );
                return (
                  <div className="lob" key={lob.id}>
                    <div className="lobhd">
                      <span className="lobnm">{lob.name}</span>
                      <span className="lobseats">{lob.seats ?? "?"} seats{lob.owner ? ` · ${lob.owner}` : ""}</span>
                      <span className="lobright">
                        {tix.length === 0 && <span className="flagchip">No tickets</span>}
                        <span className="lobms">{done} / {applicable} milestones</span>
                        <span className="lobdate">Go-live {fmtDate(a.wave.goLive)}</span>
                      </span>
                    </div>
                    <MilestoneStepper milestones={lob.milestones} accent={accent} />
                    {tix.length > 0 ? (
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
                    ) : (
                      <div className="empty">
                        ⚠ No implementation tickets — {lob.seats ?? "?"} seats, go-live {fmtDate(a.wave.goLive)}
                        <a className="btn primary" href={jiraCreateUrl()} target="_blank" rel="noopener noreferrer">+ Create tickets</a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}

      <div className="sec"><span className="idx">02</span><h2>At Risk</h2><span className="count">{boardCount} ITEMS · MOST URGENT FIRST</span></div>
      {boardCount === 0 ? (
        <div style={{ padding: "26px 0", color: "var(--muted)", fontSize: 14 }}>
          {configured ? "Nothing currently threatens a go-live date." : "Connect Jira to populate live risk."}
        </div>
      ) : (
        <>
          {watch.map(({ wave, text }, i) => (
            <div className="rrow" key={`w-${i}`}>
              <span className="dot d-acc" /><span className="rk">——</span>
              <span className="rs">{text}</span>
              <span className="rw">{wave}</span><span className="rf acc">No ticket</span>
              <span className="act"><a className="btn primary" href={jiraCreateUrl()} target="_blank" rel="noopener noreferrer">+ Create tickets</a></span>
            </div>
          ))}
          {atRisk.map(({ t, wave }) => {
            const d = riskDelta(t);
            return (
              <div className="rrow" key={t.key}>
                <span className={`dot ${dotCls(t.severity)}`} /><span className="rk">{t.key}</span>
                <span className="rs">{t.summary}</span>
                <span className="rw">{wave}</span>
                <span className={`rf ${d.cls}`}>{d.txt}</span>
                <span className="act"><a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">{riskAction(t)}</a></span>
              </div>
            );
          })}
        </>
      )}

      <div className="foot">
        <span>Tickets, at-risk &amp; counts are live from Jira · milestones are maintained in-app</span>
        <span>{configured ? "Auto-refreshes every ~60s" : "Offline"}</span>
      </div>
    </div>
  );
}
