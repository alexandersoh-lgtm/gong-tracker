import ccData from "@/data/command-center.json";
import { fmtDate } from "@/lib/loadCommandCenter";
import Tabs from "../Tabs";

export const revalidate = 600;
export const metadata = { title: "Risks — Launch Command Center" };

interface Risk {
  title: string;
  detail: string;
  owner: string;
  likelihood: string;
  impact: string;
  status: string;
  mitigation: string;
}
interface Decision {
  date: string;
  decision: string;
  owner: string;
}

const sevCls = (v: string) =>
  v === "high" ? "sev high" : v === "medium" ? "sev med" : "sev low";

export default function RisksPage() {
  const data = ccData as unknown as { risks?: Risk[]; decisions?: Decision[] };
  const risks = data.risks ?? [];
  const decisions = data.decisions ?? [];
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...risks].sort((a, b) => (order[a.impact] ?? 9) - (order[b.impact] ?? 9));

  return (
    <div className="cc">
      <div className="top"><span>Gong Engage &amp; Forecast — Implementation</span><span className="live">Risk register</span></div>
      <Tabs />
      <div className="subhead"><h1>Risks &amp; Decisions</h1><p>Program-level risks and the key decisions log — maintained in-app.</p></div>

      <div className="sec"><span className="idx">01</span><h2>Risk Register</h2><span className="count">{risks.length} OPEN · BY IMPACT</span></div>
      <div className="riskgrid">
        {sorted.map((r) => (
          <div className="riskcard" key={r.title}>
            <div className="rc-top">
              <span className="rc-title">{r.title}</span>
              <span className={`rc-status ${r.status}`}>{r.status}</span>
            </div>
            <p className="rc-detail">{r.detail}</p>
            <div className="rc-badges">
              <span className={sevCls(r.likelihood)}>Likelihood: {r.likelihood}</span>
              <span className={sevCls(r.impact)}>Impact: {r.impact}</span>
            </div>
            <div className="rc-mit"><span className="rc-lbl">Mitigation</span> {r.mitigation}</div>
            <div className="rc-owner">Owner · {r.owner}</div>
          </div>
        ))}
      </div>

      <div className="sec"><span className="idx">02</span><h2>Decisions Log</h2><span className="count">{decisions.length} ENTRIES</span></div>
      {decisions.map((d, i) => (
        <div className="decrow" key={i}>
          <span className="decdate">{fmtDate(d.date)}</span>
          <span className="dectext">{d.decision}</span>
          <span className="decowner">{d.owner}</span>
        </div>
      ))}
    </div>
  );
}
