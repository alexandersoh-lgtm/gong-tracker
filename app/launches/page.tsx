import { fmtDate } from "@/lib/utils";
import launchData from "@/data/launches.json";
import { LaunchData, PhaseStatus } from "@/app/types";

const phaseStyles: Record<PhaseStatus, { cell: string; label: string }> = {
  complete:    { cell: "bg-emerald-50 dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-300", label: "Done" },
  in_progress: { cell: "bg-blue-50 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700/50 text-blue-700 dark:text-blue-300", label: "Active" },
  not_started: { cell: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]", label: "—" },
  na:          { cell: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]", label: "N/A" },
};

const PHASE_W = "w-[72px] min-w-[72px]";
const GOLIVE_W = "w-[86px] min-w-[86px]";

function PhaseCell({ status }: { status: PhaseStatus }) {
  const s = phaseStyles[status] ?? phaseStyles.not_started;
  return (
    <td className={`${PHASE_W} text-center text-xs font-medium py-3 px-1 border ${s.cell}`}>
      {s.label}
    </td>
  );
}

function LaunchTable({ groups, phases, type }: { groups: LaunchData["groups"]; phases: string[]; type: "engage" | "forecast" }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "160px" }} />
          {phases.map((p) => <col key={p} style={{ width: "72px" }} />)}
          <col style={{ width: "86px" }} />
        </colgroup>
        <thead>
          <tr className="bg-[var(--surface-2)]">
            <th className="text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide px-5 py-3">
              Group
            </th>
            {phases.map((p) => (
              <th key={p} className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide py-3 px-1">
                {p}
              </th>
            ))}
            <th className="text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide py-3 px-2">
              Go-Live
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {groups.map((g) => (
            <tr key={g.id} className="hover:bg-[var(--surface-2)] transition-colors">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-[var(--text)] truncate">{g.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{g.fullName}</p>
              </td>
              {phases.map((p) => (
                <PhaseCell key={p} status={((type === "forecast" ? g.forecast[p] : g.engage[p]) ?? "not_started") as PhaseStatus} />
              ))}
              <td className={`${GOLIVE_W} text-center text-xs text-[var(--text)] py-3 px-2 whitespace-nowrap`}>
                {fmtDate(g.targetGoLive)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LaunchesPage() {
  const launches = launchData as LaunchData;
  const forecastGroups = launches.groups.filter((g) => g.forecastInScope);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">Launch Tracker</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          Phase-by-phase launch status for each business unit, across Engage and Forecast products.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-[var(--text-muted)] font-medium uppercase tracking-wide">Legend:</span>
        {(["complete", "in_progress", "not_started", "na"] as PhaseStatus[]).map((s) => (
          <span key={s} className={`px-3 py-1 rounded border font-medium ${phaseStyles[s].cell}`}>
            {s === "complete" ? "Complete" : s === "in_progress" ? "In Progress" : s === "na" ? "N/A" : "Not Started"}
          </span>
        ))}
      </div>

      {/* Engage Matrix */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <span>🎯</span> Gong Engage
        </h2>
        <LaunchTable groups={launches.groups} phases={launches.phases} type="engage" />
      </section>

      {/* Forecast Matrix — ASA only */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1 flex items-center gap-2">
          <span>📊</span> Gong Forecast
        </h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">ASA only — 340 seats. Phase 2 teams are Engage-only.</p>
        <LaunchTable groups={forecastGroups} phases={launches.phases} type="forecast" />
      </section>

      {/* Group Notes */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Group Notes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {launches.groups.map((g) => (
            <div key={g.id} className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text)] text-sm">{g.name}</p>
                    {!g.forecastInScope && (
                      <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded">Engage only</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{g.fullName}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2 text-right">
                  <span className="block text-[10px] uppercase tracking-wide mb-0.5">Ops Owner</span>
                  {g.launchOwner}
                </span>
              </div>
              <p className="text-xs text-[var(--text)] leading-relaxed">{g.notes}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
