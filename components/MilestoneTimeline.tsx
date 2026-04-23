import { Milestone } from "@/app/types";

export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="flex items-start w-full">
      {milestones.map((m, i) => {
        const isFirst = i === 0;
        const isLast = i === milestones.length - 1;
        const isComplete = m.status === "complete";
        const isCurrent = m.status === "in_progress";
        const prevComplete = i > 0 && milestones[i - 1].status === "complete";

        // Line to the left of this dot is filled if previous milestone is complete
        const leftFilled = !isFirst && prevComplete;
        // Line to the right of this dot is filled if this milestone is complete
        const rightFilled = !isLast && isComplete;

        return (
          <div key={m.id} className="flex-1 flex flex-col items-center min-w-0">
            {/* Dot + connector row */}
            <div className="flex items-center w-full">
              {/* Left connector */}
              {!isFirst && (
                <div className={`flex-1 h-[2px] transition-colors duration-500 ${leftFilled ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"}`} />
              )}
              {isFirst && <div className="flex-1" />}

              {/* Dot */}
              <div className="relative shrink-0 flex items-center justify-center">
                {isCurrent && (
                  <div className="absolute w-5 h-5 rounded-full bg-indigo-500/20 dark:bg-indigo-500/15 animate-pulse" />
                )}
                <div className={`w-3 h-3 rounded-full z-10 transition-all duration-300 ${
                  isComplete
                    ? "bg-indigo-500"
                    : isCurrent
                    ? "bg-[var(--surface)] border-2 border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-500/25"
                    : "bg-[var(--surface)] border-2 border-slate-300 dark:border-white/20"
                }`} />
              </div>

              {/* Right connector */}
              {!isLast && (
                <div className={`flex-1 h-[2px] transition-colors duration-500 ${rightFilled ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"}`} />
              )}
              {isLast && <div className="flex-1" />}
            </div>

            {/* Label */}
            <p className={`text-[10px] mt-2 text-center leading-tight px-0.5 truncate w-full transition-colors ${
              isCurrent
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : isComplete
                ? "text-[var(--text-muted)]"
                : "text-slate-400 dark:text-slate-500"
            }`}>
              {m.name}
            </p>
          </div>
        );
      })}
    </div>
  );
}
