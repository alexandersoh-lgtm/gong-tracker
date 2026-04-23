import programData from "@/data/program.json";
import workstreamsData from "@/data/workstreams.json";
import launchData from "@/data/launches.json";
import pmoData from "@/data/pmo.json";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";
import Link from "next/link";
import { Workstream } from "@/app/types";

const statusColor: Record<string, string> = {
  green: "border-emerald-600",
  yellow: "border-amber-500",
  red: "border-red-500",
};

function WorkstreamCard({ ws }: { ws: Workstream }) {
  const completedMilestones = ws.milestones.filter((m) => m.status === "complete").length;
  const inProgressMilestone = ws.milestones.find((m) => m.status === "in_progress");
  return (
    <Link href={`/workstreams#${ws.id}`} className="block">
      <div className={`bg-slate-800/60 rounded-xl p-5 border-l-4 ${statusColor[ws.status] ?? "border-slate-600"} hover:bg-slate-800 transition-colors h-full`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <span className="text-lg mr-2">{ws.icon}</span>
            <span className="font-semibold text-white text-sm">{ws.name}</span>
          </div>
          <StatusBadge status={ws.status} />
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>{completedMilestones}/{ws.milestones.length} milestones</span>
            <span>{ws.percentComplete}%</span>
          </div>
          <ProgressBar
            percent={ws.percentComplete}
            color={ws.status === "green" ? "emerald" : ws.status === "yellow" ? "amber" : "blue"}
          />
        </div>
        {inProgressMilestone && (
          <p className="text-xs text-slate-400 truncate">
            ▶ {inProgressMilestone.name}
          </p>
        )}
        {ws.blockers.length > 0 && (
          <p className="text-xs text-red-400 mt-1.5">⚠ {ws.blockers.length} blocker{ws.blockers.length > 1 ? "s" : ""}</p>
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
    .flatMap((ws) => ws.milestones.filter((m) => m.status !== "complete").map((m) => ({ ...m, workstream: ws.name, icon: ws.icon })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const launchSummary = launches.groups.map((g) => {
    const allPhases = launches.phases;
    const completedEngage = allPhases.filter((p) => g.engage[p] === "complete").length;
    const completedForecast = allPhases.filter((p) => g.forecast[p] === "complete").length;
    return { ...g, completedEngage, completedForecast, totalPhases: allPhases.length };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{program.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Last updated {program.lastUpdated} · Owner: {program.programOwner}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={program.status} size="md" />
          <span className="text-slate-500 text-sm">Target: {program.targetGoLive}</span>
        </div>
      </div>

      <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{program.summary}</p>

      {/* Key Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Milestones Complete", value: `${program.keyStats.completedMilestones}/${program.keyStats.totalMilestones}`, color: "text-emerald-400" },
          { label: "Open Risks", value: program.keyStats.openRisks, color: pmo.risks.filter(r => r.status === "open").length > 0 ? "text-amber-400" : "text-emerald-400" },
          { label: "Open Actions", value: program.keyStats.openActions, color: "text-blue-400" },
          { label: "Launch Groups", value: launches.groups.length, color: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-slate-400 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Workstreams */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Workstreams</h2>
          <Link href="/workstreams" className="text-blue-400 text-sm hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workstreams.map((ws) => <WorkstreamCard key={ws.id} ws={ws} />)}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Milestones */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Upcoming Milestones</h2>
          <div className="space-y-2">
            {upcomingMilestones.map((m) => (
              <div key={m.id} className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center justify-between border border-slate-700/40">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="mr-2">{m.icon}</span>{m.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.workstream}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs text-slate-300">{m.dueDate}</p>
                  <StatusBadge status={m.status} size="xs" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* High Priority Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">High Priority Actions</h2>
            <Link href="/pmo" className="text-blue-400 text-sm hover:underline">View all →</Link>
          </div>
          <div className="space-y-2">
            {openHighActions.length === 0 && (
              <p className="text-slate-500 text-sm">No high priority open actions.</p>
            )}
            {openHighActions.map((a) => (
              <div key={a.id} className="bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700/40">
                <p className="text-sm text-white">{a.title}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-slate-400">Owner: {a.owner}</span>
                  <span className="text-xs text-slate-400">Due: {a.dueDate}</span>
                  <StatusBadge status={a.status} size="xs" />
                </div>
              </div>
            ))}
          </div>

          {/* Launch Snapshot */}
          <h2 className="text-lg font-semibold text-white mt-6 mb-4">Launch Group Snapshot</h2>
          <div className="space-y-2">
            {launchSummary.map((g) => (
              <div key={g.id} className="bg-slate-800/60 rounded-lg px-4 py-3 border border-slate-700/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.fullName}</p>
                </div>
                <div className="text-right text-xs text-slate-400 space-y-0.5">
                  <p>Engage: <span className="text-white">{g.completedEngage}/{g.totalPhases}</span></p>
                  <p>Forecast: <span className="text-white">{g.completedForecast}/{g.totalPhases}</span></p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
