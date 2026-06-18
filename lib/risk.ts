import type { JiraTicket, WaveFetchResult } from "@/lib/jira";

// The four ways a ticket can threaten a go-live, in descending severity.
export type RiskFlag = "overdue" | "due-soon" | "stalled" | "hygiene";

export type MilestoneStatus = "complete" | "in_progress" | "not_started" | "na";

export interface Milestone {
  name: string;
  status: MilestoneStatus;
}

// A line of business within a wave. Milestones are a manually-maintained
// checklist (no Jira source). Tickets are matched live to the LOB by label,
// Jira component, or — for single-LOB waves — all of the wave's tickets.
export interface Lob {
  id: string;
  name: string;
  seats?: number;
  owner?: string;
  lobLabel?: string;
  components?: string[];
  allWaveTickets?: boolean;
  milestones: Milestone[];
}

export interface WaveConfig {
  id: string;
  name: string;
  subtitle?: string;
  goLive: string; // YYYY-MM-DD
  scope: string[];
  owner?: string;
  epicKeys?: string[];
  jql: string;
  prepTasks?: PrepTask[];
  watchItems?: string[];
  lobs?: Lob[];
  _placeholder?: boolean;
}

export function lobMatches(t: AssessedTicket, lob: Lob): boolean {
  if (lob.allWaveTickets) return true;
  if (lob.lobLabel && t.labels.includes(lob.lobLabel)) return true;
  if (lob.components && t.components.some((c) => lob.components!.includes(c)))
    return true;
  return false;
}

export function milestonesDone(lob: Lob): number {
  return lob.milestones.filter((m) => m.status === "complete").length;
}

// Denominator excludes "na" (not-applicable) milestones.
export function milestonesApplicable(lob: Lob): number {
  return lob.milestones.filter((m) => m.status !== "na").length;
}

export interface PrepTask {
  id: string;
  title: string;
  done: boolean;
  due?: string;
}

export interface RiskThresholds {
  dueSoonDays: number;
  stalledDays: number;
}

export interface AssessedTicket extends JiraTicket {
  isDone: boolean;
  flags: RiskFlag[];
  severity: RiskFlag | "ok";
  daysToDue: number | null;
  daysToGoLive: number;
}

export interface WaveAssessment {
  wave: WaveConfig;
  configured: boolean;
  error: string | null;
  tickets: AssessedTicket[];
  total: number;
  done: number;
  readiness: number; // 0-100
  daysToGoLive: number;
  counts: Record<RiskFlag, number>;
  atRisk: number; // overdue + due-soon (threatens the date)
  prepDone: number;
  prepTotal: number;
}

const DAY = 86_400_000;
const SEVERITY_ORDER: RiskFlag[] = ["overdue", "due-soon", "stalled", "hygiene"];

function toUTCDate(s: string): number {
  // Accepts "YYYY-MM-DD" or ISO; normalizes to UTC midnight for day math.
  const d = new Date(s);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function daysBetween(from: Date, toISO: string): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((toUTCDate(toISO) - a) / DAY);
}

export function assessTicket(
  ticket: JiraTicket,
  wave: WaveConfig,
  thresholds: RiskThresholds,
  today: Date
): AssessedTicket {
  const isDone = ticket.statusCategory === "done";
  const daysToGoLive = daysBetween(today, wave.goLive);
  const daysToDue = ticket.dueDate ? daysBetween(today, ticket.dueDate) : null;
  const flags: RiskFlag[] = [];

  if (!isDone) {
    const goLivePassed = daysToGoLive < 0;
    const dueOverdue = daysToDue !== null && daysToDue < 0;
    if (dueOverdue || goLivePassed) {
      flags.push("overdue");
    } else {
      const dueSoon = daysToDue !== null && daysToDue <= thresholds.dueSoonDays;
      const goLiveSoonNoDue =
        daysToDue === null && daysToGoLive <= thresholds.dueSoonDays;
      if (dueSoon || goLiveSoonNoDue) flags.push("due-soon");
    }

    if (ticket.updated) {
      const ageDays = Math.round((today.getTime() - new Date(ticket.updated).getTime()) / DAY);
      if (ageDays >= thresholds.stalledDays) flags.push("stalled");
    }

    if (!ticket.dueDate || !ticket.assignee) flags.push("hygiene");
  }

  const severity =
    SEVERITY_ORDER.find((f) => flags.includes(f)) ?? "ok";

  return { ...ticket, isDone, flags, severity, daysToDue, daysToGoLive };
}

function rank(t: AssessedTicket): number {
  // Lower = more urgent (sorts to top).
  const sevRank =
    t.severity === "ok" ? 99 : SEVERITY_ORDER.indexOf(t.severity);
  const dueRank = t.daysToDue ?? t.daysToGoLive;
  return sevRank * 10_000 + dueRank;
}

export function assessWave(
  wave: WaveConfig,
  fetch: WaveFetchResult,
  thresholds: RiskThresholds,
  today: Date
): WaveAssessment {
  const tickets = fetch.tickets
    .map((t) => assessTicket(t, wave, thresholds, today))
    .sort((a, b) => rank(a) - rank(b));

  const done = tickets.filter((t) => t.isDone).length;
  const total = tickets.length;
  const counts: Record<RiskFlag, number> = {
    overdue: 0,
    "due-soon": 0,
    stalled: 0,
    hygiene: 0,
  };
  for (const t of tickets) for (const f of t.flags) counts[f]++;

  const prep = wave.prepTasks ?? [];

  return {
    wave,
    configured: fetch.configured,
    error: fetch.error,
    tickets,
    total,
    done,
    readiness: total === 0 ? 0 : Math.round((done / total) * 100),
    daysToGoLive: daysBetween(today, wave.goLive),
    counts,
    atRisk: counts.overdue + counts["due-soon"],
    prepDone: prep.filter((p) => p.done).length,
    prepTotal: prep.length,
  };
}

export const RISK_META: Record<
  RiskFlag,
  { label: string; short: string; tone: string; dot: string }
> = {
  overdue: {
    label: "Overdue / past go-live",
    short: "Overdue",
    tone: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    dot: "bg-red-500",
  },
  "due-soon": {
    label: "Due before go-live",
    short: "Due soon",
    tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500",
  },
  stalled: {
    label: "Stalled — no recent update",
    short: "Stalled",
    tone: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
    dot: "bg-orange-500",
  },
  hygiene: {
    label: "Missing due date or owner",
    short: "Hygiene",
    tone: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
    dot: "bg-slate-400",
  },
};
