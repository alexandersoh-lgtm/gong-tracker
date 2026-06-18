import type { Milestone } from "@/lib/risk";

const CLS: Record<Milestone["status"], string> = {
  complete: "step done",
  in_progress: "step prog",
  not_started: "step todo",
  na: "step na",
};

export default function MilestoneStepper({
  milestones,
  accent,
}: {
  milestones: Milestone[];
  accent?: string;
}) {
  return (
    <div className="steps">
      {milestones.map((m) => {
        const prog = m.status === "in_progress";
        return (
          <div key={m.name} className={CLS[m.status]}>
            <div
              className="ic"
              style={prog && accent ? { backgroundColor: accent, borderColor: accent } : undefined}
            >
              {m.status === "complete" ? "✓" : m.status === "na" ? "–" : ""}
            </div>
            <div className="lb">
              {m.name}
              {m.status === "na" ? " (N/A)" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
