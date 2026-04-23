import workstreamsData from "@/data/workstreams.json";
import { Workstream } from "@/app/types";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";

const milestoneIcon: Record<string, string> = {
  complete: "✓",
  in_progress: "▶",
  not_started: "○",
};

const milestoneText: Record<string, string> = {
  complete: "text-emerald-400",
  in_progress: "text-blue-400",
  not_started: "text-slate-500",
};

export default function WorkstreamsPage() {
  const workstreams = workstreamsData as Workstream[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Workstreams</h1>
        <p className="text-slate-400 text-sm mt-1">Detailed status for each program workstream.</p>
      </div>

      {workstreams.map((ws) => (
        <section
          key={ws.id}
          id={ws.id}
          className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                <span className="mr-2">{ws.icon}</span>{ws.name}
              </h2>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">{ws.description}</p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <StatusBadge status={ws.status} size="md" />
              <span className="text-slate-400 text-sm">Owner: <span className="text-white">{ws.owner}</span></span>
            </div>
          </div>

          {/* Progress */}
          <div className="px-6 py-4 border-b border-slate-700/30">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Overall Progress</span>
              <span className="text-white font-medium">{ws.percentComplete}%</span>
            </div>
            <ProgressBar
              percent={ws.percentComplete}
              color={ws.status === "green" ? "emerald" : ws.status === "yellow" ? "amber" : "blue"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/40">
            {/* Milestones */}
            <div className="lg:col-span-2 p-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Milestones</h3>
              <div className="space-y-2">
                {ws.milestones.map((m) => (
                  <div key={m.id} className="flex items-start gap-3">
                    <span className={`text-sm mt-0.5 font-bold ${milestoneText[m.status]}`}>
                      {milestoneIcon[m.status]}
                    </span>
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <span className={`text-sm ${m.status === "complete" ? "text-slate-400 line-through" : m.status === "in_progress" ? "text-white" : "text-slate-400"}`}>
                        {m.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500">{m.dueDate}</span>
                        <div className="mt-0.5">
                          <StatusBadge status={m.status} size="xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: blockers + updates */}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Blockers</h3>
                {ws.blockers.length === 0 ? (
                  <p className="text-emerald-400 text-sm">No blockers 🎉</p>
                ) : (
                  <div className="space-y-3">
                    {ws.blockers.map((b) => (
                      <div key={b.id} className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                        <p className="text-sm text-red-300">{b.description}</p>
                        <div className="flex gap-3 mt-2 text-xs text-slate-400">
                          <span>Owner: {b.owner}</span>
                          <span>{b.raisedDate}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Latest Update</h3>
                {ws.updates.length === 0 ? (
                  <p className="text-slate-500 text-sm">No updates yet.</p>
                ) : (
                  <div className="space-y-2">
                    {ws.updates.slice(0, 2).map((u, i) => (
                      <div key={i} className="text-sm">
                        <span className="text-slate-500 text-xs block mb-0.5">{u.date}</span>
                        <span className="text-slate-300">{u.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
