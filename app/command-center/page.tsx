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
import TicketGroups from "./components/TicketGroups";

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

  // Coverage check: tickets under the Gong epics missing any cc-wave label (invisible until tagged)
  const gongEpics = (ccData.config as { gongEpics?: string[] }).gongEpics ?? [];
  const unmappedJql = `parent in (${gongEpics.join(",")}) AND (labels is EMPTY OR labels not in (cc-wave1,cc-wave2,cc-wave3)) AND issuetype != Epic ORDER BY updated DESC`;
  const unmappedRes =
    configured && gongEpics.length ? await searchJira(unmappedJql) : { tickets: [], error: null, configured };
  const unmapped = unmappedRes.tickets;
  const unmappedUrl = BASE ? `${BASE}/issues/?jql=${encodeURIComponent(unmappedJql)}` : "#";

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

  // Per-wave derived stats: readiness breakdown (milestone vs ticket) + GO/NO-GO gate
  const waveStats = new Map(
    assessments.map((a): [string, { mPct: number; tPct: number; blockers: string[]; go: boolean }] => {
      const lobs = a.wave.lobs ?? [];
      const mDone = lobs.reduce((s, l) => s + milestonesDone(l), 0);
      const mApp = lobs.reduce((s, l) => s + milestonesApplicable(l), 0);
      const openMs = mApp - mDone;
      const untrackedInWave = lobs.filter((l) => lobTickets(a, l).length === 0).length;
      const blockers: string[] = [];
      if (a.counts.overdue > 0) blockers.push(`${a.counts.overdue} overdue`);
      if (openMs > 0) blockers.push(`${openMs} milestone${openMs > 1 ? "s" : ""} open`);
      if (untrackedInWave > 0) blockers.push(`${untrackedInWave} LOB${untrackedInWave > 1 ? "s" : ""} untracked`);
      return [
        a.wave.id,
        {
          mPct: mApp ? Math.round((mDone / mApp) * 100) : 0,
          tPct: a.total ? Math.round((a.done / a.total) * 100) : 0,
          blockers,
          go: blockers.length === 0,
        },
      ];
    })
  );

  // Silent risks: unassigned or stalled tickets not already on the at-risk board
  const cleanup: { t: AssessedTicket; wave: string; reasons: string[] }[] = [];
  for (const a of assessments)
    for (const t of a.tickets) {
      if (t.isDone || t.severity === "overdue" || t.severity === "due-soon") continue;
      const reasons: string[] = [];
      if (!t.assignee) reasons.push("No owner");
      if (t.flags.includes("stalled")) reasons.push("Stalled");
      if (reasons.length) cleanup.push({ t, wave: a.wave.name.split(" — ")[0], reasons });
    }

  // Owner accountability: at-risk items grouped by assignee, busiest first
  const byOwner = new Map<string, { t: AssessedTicket; wave: string }[]>();
  for (const r of atRisk) {
    const o = r.t.assignee ?? "Unassigned";
    if (!byOwner.has(o)) byOwner.set(o, []);
    byOwner.get(o)!.push(r);
  }
  const owners = Array.from(byOwner.entries()).sort((x, y) => y[1].length - x[1].length);

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
          const st = waveStats.get(a.wave.id)!;
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
              <div className="tbreak">Milestones {st.mPct}% · Tickets {st.tPct}%</div>
            </div>
          );
        })}
      </div>

      <div className="mstrip">
        <a className="m warn" href="#atrisk"><div className="mk">Needs action ↓</div><div className="mv warnv">{totalAtRisk}</div><div className="mn">tickets at risk of slipping</div></a>
        <div className="m gap"><div className="mk">Untracked LOBs</div><div className="mv gapv">{untracked}</div><div className="mn">{firstUntracked ? `${firstUntracked.name}${untracked > 1 ? ` +${untracked - 1} more` : ""} · no tickets` : "all LOBs have tickets"}</div></div>
        <div className="m wall"><div className="mk">SalesLoft off-board</div><div className="mv wallv">{tMinus(offboardDays)}</div><div className="mn">hard cutover · {fmtDate(ccData.config.offboardDate)}</div></div>
      </div>

      {boardCount > 0 && (
        <a className="riskstrip" href="#atrisk">
          <span className="rs-badge">⚠ {boardCount}</span>
          <span className="rs-text">
            need attention
            {atRisk.length > 0 && (
              <> — {atRisk.slice(0, 3).map((r) => r.t.key).join(", ")}{atRisk.length > 3 ? ` +${atRisk.length - 3}` : ""}</>
            )}
          </span>
          <span className="rs-go">View all ↓</span>
        </a>
      )}

      {unmapped.length > 0 && (
        <div className="banner warn2">
          <h3>⚠ {unmapped.length} ticket{unmapped.length === 1 ? "" : "s"} in the Gong epics not mapped to a wave</h3>
          <p>These won&apos;t appear on any wave until they get a <code>cc-wave1/2/3</code> label. <a href={unmappedUrl} target="_blank" rel="noopener noreferrer">Review in Jira →</a></p>
          <div className="unmapped">
            {unmapped.slice(0, 8).map((t) => (
              <a key={t.key} href={t.url} target="_blank" rel="noopener noreferrer">
                <span className="um-k">{t.key}</span> {t.summary}
              </a>
            ))}
            {unmapped.length > 8 && <span className="um-more">+{unmapped.length - 8} more</span>}
          </div>
        </div>
      )}

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
        const st = waveStats.get(a.wave.id)!;
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
              <div className={`gate ${st.go ? "go" : "nogo"}`}>
                {st.go ? "✅ GO — all go-live criteria met" : `🚦 NO-GO — ${st.blockers.join(" · ")}`}
              </div>
              {(a.wave.lobs ?? []).map((lob) => {
                const tix = lobTickets(a, lob);
                const done = milestonesDone(lob);
                const applicable = milestonesApplicable(lob);
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
                      <TicketGroups tickets={tix} />
                    ) : (
                      <div className="empty">
                        ⚠ No implementation tickets — {lob.seats ?? "?"} seats, go-live {fmtDate(a.wave.goLive)}
                        <a className="btn primary" href={jiraCreateUrl()} target="_blank" rel="noopener noreferrer">+ Create tickets</a>
                      </div>
                    )}
                  </div>
                );
              })}
              {(() => {
                const lobs = a.wave.lobs ?? [];
                const unmatched = a.tickets.filter((t) => !lobs.some((l) => lobMatches(t, l)));
                if (unmatched.length === 0) return null;
                return (
                  <div className="lob">
                    <div className="lobhd">
                      <span className="lobnm">Unassigned to a line of business</span>
                      <span className="lobseats">{unmatched.length} ticket{unmatched.length === 1 ? "" : "s"}</span>
                      <span className="lobright">
                        <span className="flagchip">Needs LOB tag</span>
                      </span>
                    </div>
                    <TicketGroups tickets={unmatched} />
                  </div>
                );
              })()}
            </div>
          </details>
        );
      })}

      <div className="sec" id="atrisk"><span className="idx">02</span><h2>At Risk</h2><span className="count">{boardCount} ITEMS · MOST URGENT FIRST</span></div>
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

      <div className="sec"><span className="idx">03</span><h2>Needs Cleanup</h2><span className="count">{cleanup.length} ITEMS · NO OWNER / STALLED</span></div>
      {cleanup.length === 0 ? (
        <div className="emptyline">{configured ? "No hygiene issues — every active ticket has an owner and recent activity." : "Connect Jira to populate."}</div>
      ) : (
        cleanup.slice(0, 25).map(({ t, wave, reasons }) => (
          <div className="rrow" key={t.key}>
            <span className="dot d-slate" /><span className="rk">{t.key}</span>
            <span className="rs">{t.summary}</span>
            <span className="rw">{wave}</span>
            <span className="rf slate">{reasons.join(" · ")}</span>
            <span className="act"><a className="btn" href={t.url} target="_blank" rel="noopener noreferrer">Fix ↗</a></span>
          </div>
        ))
      )}
      {cleanup.length > 25 && <div className="emptyline">+{cleanup.length - 25} more</div>}

      <div className="sec"><span className="idx">04</span><h2>By Owner — Who Owes What</h2><span className="count">at-risk items by assignee</span></div>
      {owners.length === 0 ? (
        <div className="emptyline">No at-risk items are assigned right now.</div>
      ) : (
        owners.map(([owner, items]) => (
          <div className="ownerrow" key={owner}>
            <span className="ownername">{owner}</span>
            <span className="ownercount">{items.length}</span>
            <span className="ownerkeys">{items.map((it) => it.t.key).join(", ")}</span>
          </div>
        ))
      )}

      <div className="foot">
        <span>Tickets, at-risk &amp; counts are live from Jira · milestones are maintained in-app</span>
        <span>{configured ? "Auto-refreshes every ~60s" : "Offline"}</span>
      </div>
    </div>
  );
}
