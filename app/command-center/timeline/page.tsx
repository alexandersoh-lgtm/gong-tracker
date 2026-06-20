import { loadCommandCenter, WAVE_ACCENTS, fmtDate, tMinus, ccConfig } from "@/lib/loadCommandCenter";
import { milestonesDone, milestonesApplicable } from "@/lib/risk";
import Tabs from "../Tabs";

export const revalidate = 60;
export const metadata = { title: "Timeline — Launch Command Center" };

const DAY = 86_400_000;
const START = "2026-06-15";
const END = "2026-08-31";
function ms(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
const SPAN = (ms(END) - ms(START)) / DAY;
function x(iso: string): number {
  return Math.max(0, Math.min(100, ((ms(iso) - ms(START)) / DAY / SPAN) * 100));
}

export default async function TimelinePage() {
  const { assessments, today } = await loadCommandCenter();
  const todayISO = today.toISOString().slice(0, 10);
  const offboard = ccConfig.offboardDate;

  const months = [
    { iso: "2026-06-15", label: "Jun" },
    { iso: "2026-07-01", label: "Jul" },
    { iso: "2026-08-01", label: "Aug" },
  ];

  return (
    <div className="cc">
      <div className="top"><span>Gong Engage &amp; Forecast — Implementation</span><span className="live">Timeline · live</span></div>
      <Tabs />
      <div className="subhead"><h1>Timeline</h1><p>Runway to each go-live, with milestone progress, and the immovable SalesLoft off-board.</p></div>

      <div className="tl">
        <div className="tlaxis">
          {months.map((m) => (
            <span key={m.label} className="tlmonth" style={{ left: `${x(m.iso)}%` }}>{m.label}</span>
          ))}
        </div>
        <div className="tlbody">
          {/* vertical markers */}
          {months.slice(1).map((m) => (
            <div key={m.label} className="tlgrid" style={{ left: `${x(m.iso)}%` }} />
          ))}
          <div className="tlmark today" style={{ left: `${x(todayISO)}%` }}><span>Today</span></div>
          <div className="tlmark off" style={{ left: `${x(offboard)}%` }}><span>Off-board {fmtDate(offboard)}</span></div>

          {assessments.map((a, wi) => {
            const accent = WAVE_ACCENTS[wi % WAVE_ACCENTS.length];
            const lobs = a.wave.lobs ?? [];
            const md = lobs.reduce((s, l) => s + milestonesDone(l), 0);
            const mApp = lobs.reduce((s, l) => s + milestonesApplicable(l), 0);
            const rd = mApp ? Math.round((md / mApp) * 100) : 0;
            const left = x(todayISO);
            const width = Math.max(1.5, x(a.wave.goLive) - left);
            return (
              <div className="tlrow" key={a.wave.id}>
                <div className="tllabel">
                  <span className="wbadge" style={{ background: accent }}>Wave {wi + 1}</span>
                  <span className="tlname">{a.wave.name.split(" — ")[1] ?? a.wave.name}</span>
                  <span className="tlmeta">{fmtDate(a.wave.goLive)} · {tMinus(a.daysToGoLive)} · {rd}% milestones</span>
                </div>
                <div className="tltrack">
                  <div className="tlbar" style={{ left: `${left}%`, width: `${width}%`, background: `${accent}26`, borderColor: accent }}>
                    <div className="tlbarfill" style={{ width: `${rd}%`, background: accent }} />
                  </div>
                  <div className="tlflag" style={{ left: `${x(a.wave.goLive)}%`, color: accent }}>▮</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="tllegend">
          <span><i className="lg-today" /> Today</span>
          <span><i className="lg-off" /> SalesLoft off-board (hard)</span>
          <span><i className="lg-bar" /> Runway · filled = milestone progress · ▮ = go-live</span>
        </div>
      </div>
    </div>
  );
}
