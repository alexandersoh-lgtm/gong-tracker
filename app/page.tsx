import programData from "@/data/program.json";
import workstreamsData from "@/data/workstreams.json";
import launchData from "@/data/launches.json";
import pmoData from "@/data/pmo.json";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";
import { Workstream } from "@/app/types";
import { fmtDate } from "@/lib/utils";

const statusBorder: Record<string, string> = {
  green:  "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red:    "border-l-red-500",
};

const progressColor: Record<string, "emerald" | "amber" | "blue"> = {
  green: "emerald", yellow: "amber", red: "blue",
};

function WorkstreamCard({ ws }: { ws: Workstream }) {
  const done = ws.milestones.filter((m) => m.status === "complete").length;
  const active = ws.milestones.find((m) => m.status === "in_progress");
  return (
    <Link href={`/workstreams#${ws.id}`} className="block group">
      <div className={`h-full bg-[var(--surface)] rounded-xl p-4 border-l-2 border border-[var(--border)] ${statusBorder[ws.status] ?? "border-l-slate-400"} hover:shadow-md dark:hover:shadow-black/20 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all duration-200`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{ws.icon}</span>
            <span className="font-semibold text-[var(--text)] text-sm leading-tight">{ws.name}</span>
          </div>
          <StatusBadge status={ws.status} size="xs" />
        </div>
        <div className="mb-2.5">
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>{done}/{ws.milestones.length} milestones</span>
            <span className="font-medium text-[var(--text)]">{ws.percentComplete}%</span>
          </div>
          <ProgressBar percent={ws.percentComplete} color={progressColor[ws.status] ?? "blue"} />
        </div>
        {active && (
          <p className="text-xs text-[var(--text-muted)] truncate">
            <span className="text-blue-500 dark:text-blue-400 mr-1">▶</span>{active.name}
          </p>
        )}
        {ws.blockers.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
            <span>⚠</span>{ws.blockers.length} blocker{ws.blockers.length > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const program = programData;
  const workstreams = workstreamsData as Workstream[];
  const launches = launchData;
  const pmo = pmoData;

  const openHighActions = pmo.actions.filter(
    (a) => (a.status === "open" || a.status === "in_progress") && a.priority === "high"
  );

  const upcomingMilestones = workstreams
    .flatMap((ws) =>
      ws.milestones
        .filter((m) => m.status !== "complete")
        .map((m) => ({ ...m, workstream: ws.name, icon: ws.icon }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 6);

  const completedMilestones = workstreams.flatMap((ws) => ws.milestones.filter((m) => m.status === "complete")).length;
  const totalMilestones = workstreams.flatMap((ws) => ws.milestones).length;

  return (
    <div className="space-y-6">

      {/* Hero — compact */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-6 py-5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/70 via-transparent to-transparent dark:from-indigo-500/5 dark:to-transparent pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">G</span>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Initiative Tracker</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text)] tracking-tight leading-tight">
              {program.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
              <span>Owner: <span className="text-[var(--text)] font-medium">{program.programOwner}</span></span>
              <span>Started: <span className="text-[var(--text)] font-medium">{fmtDate(program.startDate)}</span></span>
              <span>Target: <span className="text-[var(--text)] font-medium">{fmtDate(program.targetGoLive)}</span></span>
              <span>Updated: <span className="text-[var(--text)] font-medium">{fmtDate(program.lastUpdated)}</span></span>
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge status={program.status} size="md" />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Milestones Complete", value: `${completedMilestones}/${totalMilestones}`, sub: `${Math.round((completedMilestones / totalMilestones) * 100)}% done`, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Open Risks",          value: pmo.risks.filter((r) => r.status === "open").length, sub: "require attention", color: "text-amber-600 dark:text-amber-400" },
          { label: "Open Actions",        value: pmo.actions.filter((a) => a.status === "open" || a.status === "in_progress").length, sub: "across workstreams", color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Launch Groups",       value: launches.groups.length, sub: "business units", color: "text-violet-600 dark:text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface)] rounded-xl px-4 py-3 border border-[var(--border)] flex items-center gap-3">
            <p className={`text-2xl font-bold tabular-nums shrink-0 ${s.color}`}>{s.value}</p>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text)] leading-tight">{s.label}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Workstreams */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text)]">Workstreams</h2>
          <Link href="/workstreams" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">View details →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workstreams.map((ws) => <WorkstreamCard key={ws.id} ws={ws} />)}
        </div>
      </section>

      {/* Bottom 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Upcoming Milestones */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">Upcoming Milestones</h2>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden flex-1">
            {upcomingMilestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-base shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text)] truncate">{m.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{m.workstream}</p>
                  </div>
                </div>
                <div className="shrink-0 ml-2 text-right">
                  <p className="text-[10px] text-[var(--text-muted)]">{fmtDate(m.dueDate)}</p>
                  <StatusBadge status={m.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* High Priority Actions */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">High Priority Actions</h2>
            <Link href="/pmo" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">View all →</Link>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden flex-1">
            {openHighActions.length === 0 ? (
              <p className="px-4 py-5 text-xs text-[var(--text-muted)] text-center">No high priority open actions</p>
            ) : (
              openHighActions.map((a) => (
                <div key={a.id} className="px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <p className="text-xs text-[var(--text)] leading-snug">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--text-muted)]">{a.owner}</span>
                    <span className="text-[var(--border)]">·</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Due {fmtDate(a.dueDate)}</span>
                    <StatusBadge status={a.status} size="xs" />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Launch Snapshot */}
        <section className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">Launch Snapshot</h2>
            <Link href="/launches" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">Full matrix →</Link>
          </div>
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden flex-1">
            {launches.groups.map((g) => {
              const completedEngage = launches.phases.filter((p) => (g.engage as Record<string, string>)[p] === "complete").length;
              const completedForecast = launches.phases.filter((p) => (g.forecast as Record<string, string>)[p] === "complete").length;
              const total = launches.phases.length;
              const allDone = completedEngage === total && completedForecast === total;
              return (
                <div key={g.id} className="px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">{g.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Target: {fmtDate(g.targetGoLive)}</p>
                    </div>
                    {allDone && <StatusBadge status="complete" size="xs" />}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Engage</p>
                      <ProgressBar percent={Math.round((completedEngage / total) * 100)} color="indigo" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Forecast</p>
                      <ProgressBar percent={Math.round((completedForecast / total) * 100)} color="emerald" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
