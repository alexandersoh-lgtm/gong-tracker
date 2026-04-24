import type { Workstream } from "@/app/types";

/** Auto-calculate % complete from milestone statuses */
export function calcProgress(milestones: Workstream["milestones"]): number {
  if (!milestones.length) return 0;
  const done = milestones.filter((m) => m.status === "complete").length;
  return Math.round((done / milestones.length) * 100);
}

/** Collect every open blocker across all workstreams */
export function getAllBlockers(workstreams: Workstream[]) {
  return workstreams.flatMap((ws) =>
    ws.blockers.map((b) => ({ ...b, workstream: ws.name, icon: ws.icon, wsId: ws.id }))
  );
}

/** Count open + in_progress actions across workstreams */
export function countWorkstreamActions(workstreams: Workstream[]) {
  return workstreams.flatMap((ws) => ws.actions)
    .filter((a) => a.status === "open" || a.status === "in_progress").length;
}

/** Find the next upcoming go-live milestone */
export function getNextGoLive(workstreams: Workstream[]) {
  return workstreams
    .flatMap((ws) => ws.milestones.filter((m) =>
      m.status === "not_started" && /go.live|launch|GA|wave|pilot/i.test(m.name)
    ))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
}

/** Find milestones that are overdue (in_progress or not_started past dueDate) */
export function getOverdueMilestones(workstreams: Workstream[], today: string) {
  return workstreams.flatMap((ws) =>
    ws.milestones
      .filter((m) => m.status !== "complete" && m.dueDate < today)
      .map((m) => ({ ...m, workstream: ws.name, icon: ws.icon }))
  );
}
