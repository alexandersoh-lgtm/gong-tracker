// Server-side Jira REST client. Reads credentials from env vars that live ONLY
// in Vercel (and your local .env.local) — never committed.
//
//   JIRA_BASE_URL   e.g. https://zillowgroup.atlassian.net
//   JIRA_EMAIL      your Atlassian account email
//   JIRA_API_TOKEN  token from id.atlassian.com/manage-profile/security/api-tokens
//
// If any are missing, the app still renders — fetches return an "unconfigured"
// result so the page shows structure with a "Connect Jira" banner.

export type JiraStatusCategory = "new" | "indeterminate" | "done";

export interface JiraTicket {
  key: string;
  summary: string;
  status: string;
  statusCategory: JiraStatusCategory;
  issueType: string;
  assignee: string | null;
  dueDate: string | null; // YYYY-MM-DD
  updated: string; // ISO timestamp
  priority: string | null;
  labels: string[];
  components: string[];
  sprint: { name: string; range: string | null } | null;
  storyPoints: number | null;
  url: string;
}

export interface WaveFetchResult {
  tickets: JiraTicket[];
  error: string | null;
  configured: boolean;
}

const BASE = process.env.JIRA_BASE_URL?.replace(/\/$/, "");
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_API_TOKEN;

export function jiraConfigured(): boolean {
  return Boolean(BASE && EMAIL && TOKEN);
}

const FIELDS = [
  "summary",
  "status",
  "issuetype",
  "assignee",
  "duedate",
  "updated",
  "priority",
  "labels",
  "components",
  "customfield_11670", // Sprint
  "customfield_12072", // Story Points
];

const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${MO[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

interface RawSprint {
  name?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
}
function pickSprint(arr: RawSprint[] | null | undefined): { name: string; range: string | null } | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const chosen = arr.find((s) => s.state === "active") ?? arr[arr.length - 1];
  const range =
    chosen.startDate && chosen.endDate ? `${shortDate(chosen.startDate)} – ${shortDate(chosen.endDate)}` : null;
  return { name: chosen.name ?? "Sprint", range };
}

interface RawIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { name?: string; statusCategory?: { key?: string } };
    issuetype?: { name?: string };
    assignee?: { displayName?: string } | null;
    duedate?: string | null;
    updated?: string;
    priority?: { name?: string } | null;
    labels?: string[];
    components?: { name?: string }[];
    customfield_11670?: RawSprint[] | null;
    customfield_12072?: number | null;
  };
}

function mapIssue(issue: RawIssue): JiraTicket {
  const f = issue.fields ?? {};
  const catKey = (f.status?.statusCategory?.key ?? "new") as JiraStatusCategory;
  return {
    key: issue.key,
    summary: f.summary ?? "(no summary)",
    status: f.status?.name ?? "Unknown",
    statusCategory: catKey,
    issueType: f.issuetype?.name ?? "Issue",
    assignee: f.assignee?.displayName ?? null,
    dueDate: f.duedate ?? null,
    updated: f.updated ?? "",
    priority: f.priority?.name ?? null,
    labels: f.labels ?? [],
    components: (f.components ?? []).map((c) => c.name ?? "").filter(Boolean),
    sprint: pickSprint(f.customfield_11670),
    storyPoints: typeof f.customfield_12072 === "number" ? f.customfield_12072 : null,
    url: `${BASE}/browse/${issue.key}`,
  };
}

// Uses the current enhanced-search endpoint (/rest/api/3/search/jql) with
// token-based pagination. Caps total pulled per wave at `maxTotal`.
export async function searchJira(
  jql: string,
  maxTotal = 200
): Promise<WaveFetchResult> {
  if (!jiraConfigured()) {
    return { tickets: [], error: null, configured: false };
  }

  const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const collected: JiraTicket[] = [];
  let nextPageToken: string | undefined;

  try {
    do {
      const body: Record<string, unknown> = {
        jql,
        fields: FIELDS,
        maxResults: Math.min(100, maxTotal - collected.length),
      };
      if (nextPageToken) body.nextPageToken = nextPageToken;

      const res = await fetch(`${BASE}/rest/api/3/search/jql`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        // ISR: Next caches this fetch; page-level revalidate controls freshness.
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          tickets: collected,
          configured: true,
          error: `Jira ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        };
      }

      const data = (await res.json()) as {
        issues?: RawIssue[];
        nextPageToken?: string;
        isLast?: boolean;
      };

      for (const issue of data.issues ?? []) collected.push(mapIssue(issue));
      nextPageToken = data.isLast ? undefined : data.nextPageToken;
    } while (nextPageToken && collected.length < maxTotal);

    return { tickets: collected, error: null, configured: true };
  } catch (err) {
    return {
      tickets: collected,
      configured: true,
      error: err instanceof Error ? err.message : "Unknown Jira fetch error",
    };
  }
}
