import programData from "@/data/program.json";
import workstreamsData from "@/data/workstreams.json";
import launchData from "@/data/launches.json";
import pmoData from "@/data/pmo.json";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";
import { Workstream } from "@/app/types";

const statusBorder: Record<string, string> = {
  green:  "border-emerald-200 dark:border-emerald-500/20",
  yellow: "border-amber-200 dark:border-amber-500/20",
  red:    "border-red-200 dark:border-red-500/20",
};

const progressColor: Record<string, "emerald" | "amber" | "blue"> = {
  green: "emerald", yellow: "amber", red: "blue",
};

function WorkstreamCard({ ws }: { ws: Workstream }) {
  const done = ws.milestones.filter((m) => m.status === "complete").length;
  const active = ws.milestones.find((m) => m.status === "in_progress");
  return (
    <Link href={`/workstreams#${ws.id}`} className="block group">
      <div className={`h-full bg-[var(--surface)] rounded-2xl p-5 border ${statusBorder[ws.status] ?? "border-[var(--border)]"} hover:shadow-lg dark:hover:shadow-black/30 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-200`}>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{ws.icon}</span>
            <span className="font-semibold text-[var(--text)] text-sm leading-tight">{ws.name}</span>
          </div>
          <StatusBadge status={ws.status} size="xs" />
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
            <span>{done} of {ws.milestones.length} milestones</span>
            <span className="font-medium text-[var(--text)]">{ws.percentComplete}%</span>
          </div>
          <ProgressBar percent={ws.percentComplete} color={progressColor[ws.status] ?? "blue"} />
        </div>
        {active && (
          <p className="text-xs text-[var(--text-muted)] truncate mt-2">
            <span className="text-blue-500 dark:text-blue-400 mr-1">▶</span>{active.name}
          </p>
        )}
        {ws.blockers.length > 0 && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 flex items-center gap-1">
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
    .slice(0, 5);

  const completedMilestones = workstreams.flatMap((ws) => ws.milestones.filter((m) => m.status === "complete")).length;
  const totalMilestones = workstreams.flatMap((ws) => ws.milestones).length;

  return (
    <div className="space-y-10">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-8">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-transparent to-violet-50/40 dark:from-indigo-500/5 dark:via-transparent dark:to-violet-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-indigo-100/60 to-transparent dark:from-indigo-500/5 dark:to-transparent rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Initiative Tracker
                </span>
              </div>
              <h1 className="text-3xl font-bold text-[var(--text)] tracking-tight leading-tight max-w-xl">
                {program.name}
              </h1>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-2xl">
                {program.summary}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <StatusBadge status={program.status} size="md" />
              <div className="text-right">
                <p className="text-xs text-[var(--text-muted)]">Target go-live</p>
                <p className="text-sm font-semibold text-[var(--text)]">{program.targetGoLive}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[var(--border)] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
            <span>Owner: <span className="text-[var(--text)] font-medium">{program.programOwner}</span></span>
            <span>Start: <span className="text-[var(--text)] font-medium">{program.startDate}</span></span>
            <span>Last updated: <span className="text-[var(--text)] font-medium">{program.lastUpdated}</span></span>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Milestones Complete", value: `${completedMilestones}/${totalMilestones}`, sub: `${Math.round((completedMilestones / totalMilestones) * 100)}% done`, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Open Risks",          value: pmo.risks.filter((r) => r.status === "open").length, sub: "require attention", color: "text-amber-600 dark:text-amber-400" },
          { label: "Open Actions",        value: pmo.actions.filter((a) => a.status === "open" || a.status === "in_progress").length, sub: "across all workstreams", color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Launch Groups",       value: launches.groups.length, sub: "business units", color: "text-violet-600 dark:text-violet-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--surface)] rounded-2xl p-5 border border-[var(--border)] hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
            <p className={`text-3xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-[var(--text)] mt-1">{s.label}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Workstreams */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--text)]">Workstreams</h2>
          <Link href="/workstreams" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">
            View details →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {workstreams.map((ws) => <WorkstreamCard key={ws.id} ws={ws} />)}
        </div>
      </section>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Upcoming Milestones */}
        <section>
          <h2 className="text-base font-semibold text-[var(--text)] mb-4">Upcoming Milestones</h2>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {upcomingMilestones.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                <div className="min-w-0 flex items-center gap-3">
                  <span className="text-base shrink-0">{m.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{m.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{m.workstream}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3 space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">{m.dueDate}</p>
                  <StatusBadge status={m.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* High Priority Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[var(--text)]">High Priority Actions</h2>
            <Link href="/pmo" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-2">
              View all →
            </Link>
          </div>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {openHighActions.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">No high priority open actions</p>
            ) : (
              openHighActions.map((a) => (
                <div key={a.id} className="px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <p className="text-sm text-[var(--text)]">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-[var(--text-muted)]">{a.owner}</span>
                    <span className="text-xs text-[var(--text-muted)]">Due {a.dueDate}</span>
                    <StatusBadge status={a.status} size="xs" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Launch snapshot */}
          <h2 className="text-base font-semibold text-[var(--text)] mt-6 mb-4">Launch Snapshot</h2>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {launches.groups.map((g) => {
              const completedEngage = launches.phases.filter((p) => (g.engage as Record<string, string>)[p] === "complete").length;
              const completedForecast = launches.phases.filter((p) => (g.forecast as Record<string, string>)[p] === "complete").length;
              return (
                <div key={g.id} className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{g.name}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{g.targetGoLive}</p>
                  </div>
                  <div className="text-right text-xs text-[var(--text-muted)] space-y-0.5">
                    <p>Engage <span className="text-[var(--text)] font-medium">{completedEngage}/{launches.phases.length}</span></p>
                    <p>Forecast <span className="text-[var(--text)] font-medium">{completedForecast}/{launches.phases.length}</span></p>
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
