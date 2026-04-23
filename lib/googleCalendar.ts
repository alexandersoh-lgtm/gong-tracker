export interface CalendarMeeting {
  id: string;
  title: string;
  date: string;
  attendees: string;
  calendarLink: string;
  workstreamIds: string[];
  isPast: boolean;
  source: "calendar";
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; displayName?: string; self?: boolean }[];
  htmlLink: string;
}

const KEYWORDS = ["gong", "genesys"];

function isRelevant(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return KEYWORDS.some((k) => text.includes(k));
}

export function mapToWorkstreams(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const ws = new Set<string>();

  if (text.includes("genesys")) ws.add("genesys-dialer");
  if (text.includes("gong engage")) ws.add("gong-engage");
  if (text.includes("gong forecast")) ws.add("gong-forecast");
  if (text.includes("gong") && text.includes("pmo")) ws.add("pmo");

  // Generic "Gong" with no specific product → show in both Engage and Forecast
  const hasSpecific = ws.has("gong-engage") || ws.has("gong-forecast") || ws.has("pmo");
  if (text.includes("gong") && !hasSpecific) {
    ws.add("gong-engage");
    ws.add("gong-forecast");
  }

  return [...ws];
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to get access token");
  return data.access_token;
}

export async function getCalendarMeetings(): Promise<CalendarMeeting[]> {
  if (!process.env.GOOGLE_REFRESH_TOKEN || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return [];
  }

  try {
    const accessToken = await getAccessToken();

    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + 60);

    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    );

    const data = await res.json();
    const events: GoogleCalendarEvent[] = data.items ?? [];
    const now2 = new Date();

    return events
      .filter((e) => isRelevant(e.summary ?? "", e.description ?? ""))
      .map((e) => {
        const dateStr = e.start.dateTime ?? e.start.date ?? "";
        const date = new Date(dateStr);
        const workstreamIds = mapToWorkstreams(e.summary ?? "", e.description ?? "");
        const attendeeList = (e.attendees ?? [])
          .filter((a) => !a.self)
          .map((a) => a.displayName ?? a.email)
          .join(", ");

        return {
          id: e.id,
          title: e.summary ?? "(No title)",
          date: date.toISOString().split("T")[0],
          attendees: attendeeList || "No external attendees",
          calendarLink: e.htmlLink,
          workstreamIds,
          isPast: date < now2,
          source: "calendar" as const,
        };
      });
  } catch (err) {
    console.error("Google Calendar fetch failed:", err);
    return [];
  }
}
