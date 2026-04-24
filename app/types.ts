export type RAGStatus = "green" | "yellow" | "red" | "complete" | "in_progress" | "not_started";
export type Priority = "high" | "medium" | "low";
export type ActionStatus = "open" | "in_progress" | "complete" | "cancelled";

export interface Milestone {
  id: string;
  name: string;
  startDate?: string;
  dueDate: string;
  status: "complete" | "in_progress" | "not_started";
}

export interface Blocker {
  id: string;
  description: string;
  owner: string;
  raisedDate: string;
}

export interface Update {
  date: string;
  text: string;
}

export interface WorkstreamAction {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  priority: Priority;
  status: ActionStatus;
}

export interface UpcomingMeeting {
  id: string;
  title: string;
  date: string;
  attendees: string;
  goals: string[];
  decisionPoints: string[];
}

export interface PastMeeting {
  id: string;
  title: string;
  date: string;
  attendees: string;
  decisions: string[];
  actionItems: { title: string; owner: string; dueDate: string }[];
}

export interface Workstream {
  id: string;
  name: string;
  icon: string;
  status: RAGStatus;
  owner: string;
  percentComplete: number;
  description: string;
  milestones: Milestone[];
  blockers: Blocker[];
  updates: Update[];
  actions: WorkstreamAction[];
  meetings: {
    upcoming: UpcomingMeeting[];
    past: PastMeeting[];
  };
}

export type PhaseStatus = "complete" | "in_progress" | "not_started";

export interface LaunchGroup {
  id: string;
  name: string;
  fullName: string;
  launchOwner: string;
  targetGoLive: string;
  forecastInScope: boolean;
  notes: string;
  engage: Record<string, PhaseStatus>;
  forecast: Record<string, PhaseStatus>;
}

export interface LaunchData {
  phases: string[];
  groups: LaunchGroup[];
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  likelihood: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  owner: string;
  mitigationPlan: string;
  status: "open" | "closed" | "mitigated";
  raisedDate: string;
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  decidedBy: string;
  decidedDate: string;
  rationale: string;
}

export interface Action {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  status: ActionStatus;
  priority: Priority;
}

export interface PMOData {
  risks: Risk[];
  decisions: Decision[];
  actions: Action[];
}

export interface ProgramData {
  name: string;
  status: RAGStatus;
  startDate: string;
  targetGoLive: string;
  programOwner: string;
  lastUpdated: string;
  summary: string;
  keyStats: {
    totalMilestones: number;
    completedMilestones: number;
    openRisks: number;
    openActions: number;
  };
}
