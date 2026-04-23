import pmoData from "@/data/pmo.json";
import { PMOData, Risk, Action } from "@/app/types";
import StatusBadge from "@/components/StatusBadge";

const likelihood = { high: "text-red-400", medium: "text-amber-400", low: "text-emerald-400" };
const impact = { high: "text-red-400", medium: "text-amber-400", low: "text-emerald-400" };

function RiskScore({ l, i }: { l: Risk["likelihood"]; i: Risk["impact"] }) {
  const score = { high: 3, medium: 2, low: 1 };
  const total = score[l] + score[i];
  const color = total >= 5 ? "text-red-400" : total >= 4 ? "text-amber-400" : "text-emerald-400";
  const label = total >= 5 ? "High" : total >= 4 ? "Medium" : "Low";
  return <span className={`text-sm font-bold ${color}`}>{label}</span>;
}

function priorityColor(p: Action["priority"]) {
  return p === "high" ? "text-red-400" : p === "medium" ? "text-amber-400" : "text-slate-400";
}

export default function PMOPage() {
  const pmo = pmoData as PMOData;
  const openActions = pmo.actions.filter((a) => a.status === "open" || a.status === "in_progress");
  const closedActions = pmo.actions.filter((a) => a.status === "complete" || a.status === "cancelled");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">PMO</h1>
        <p className="text-slate-400 text-sm mt-1">Program risks, decisions log, and action items.</p>
      </div>

      {/* Risks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Risks</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {pmo.risks.filter((r) => r.status === "open").length} open
          </span>
        </div>
        <div className="space-y-3">
          {pmo.risks.map((r) => (
            <div key={r.id} className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-white text-sm">{r.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">{r.description}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div><RiskScore l={r.likelihood} i={r.impact} /></div>
                  <StatusBadge status={r.status === "open" ? "in_progress" : "complete"} size="xs" />
                </div>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-3 mt-2">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Mitigation</p>
                <p className="text-sm text-slate-300">{r.mitigationPlan}</p>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                <span>Owner: <span className="text-slate-300">{r.owner}</span></span>
                <span>Likelihood: <span className={likelihood[r.likelihood]}>{r.likelihood}</span></span>
                <span>Impact: <span className={impact[r.impact]}>{r.impact}</span></span>
                <span>Raised: {r.raisedDate}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Actions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Action Items</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
            {openActions.length} open · {closedActions.length} closed
          </span>
        </div>

        {/* Open */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/50 mb-6">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-slate-800/80">
                {["Action", "Owner", "Due Date", "Priority", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-300 uppercase tracking-wide px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {openActions
                .sort((a, b) => {
                  const p = { high: 0, medium: 1, low: 2 };
                  return p[a.priority] - p[b.priority];
                })
                .map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-white max-w-xs">{a.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">{a.owner}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">{a.dueDate}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold uppercase ${priorityColor(a.priority)}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} size="xs" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Closed */}
        {closedActions.length > 0 && (
          <details className="group">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-white select-none">
              ▸ Show {closedActions.length} closed action{closedActions.length > 1 ? "s" : ""}
            </summary>
            <div className="overflow-x-auto rounded-xl border border-slate-700/40 mt-3">
              <table className="w-full min-w-[600px]">
                <tbody className="divide-y divide-slate-700/20">
                  {closedActions.map((a) => (
                    <tr key={a.id} className="opacity-60">
                      <td className="px-4 py-2.5 text-sm text-slate-400 line-through max-w-xs">{a.title}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{a.owner}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{a.dueDate}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} size="xs" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      {/* Decisions */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Decisions Log</h2>
        <div className="space-y-3">
          {pmo.decisions.map((d) => (
            <div key={d.id} className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-white text-sm">{d.title}</h3>
                <span className="text-xs text-slate-500 shrink-0">{d.decidedDate}</span>
              </div>
              <p className="text-slate-400 text-sm">{d.description}</p>
              <div className="bg-slate-900/40 rounded-lg p-3 mt-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Rationale</p>
                <p className="text-sm text-slate-300">{d.rationale}</p>
              </div>
              <p className="text-xs text-slate-500 mt-3">Decided by: <span className="text-slate-400">{d.decidedBy}</span></p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
