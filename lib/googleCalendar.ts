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

  const hasSpecific = ws.has("gong-engage") || ws.has("gong-forecast") || ws.has("pmo");
  if (text.includes("gong") && !hasSpecific) {
    ws.add("gong-engage");
    ws.add("gong-forecast");
  }

  return [...ws];
}

function unfold(ics: string): string {
  // iCal lines folded with CRLF + whitespace must be joined
  return ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseICalDate(value: string): Date {
  // Strip TZID prefix if present (DTSTART;TZID=...:value)
  const raw = value.includes(":") ? value.split(":").pop()! : value;

  if (raw.length === 8) {
    // DATE: YYYYMMDD (all-day)
    return new Date(
      parseInt(raw.slice(0, 4)),
      parseInt(raw.slice(4, 6)) - 1,
      parseInt(raw.slice(6, 8))
    );
  }

  // DATETIME: YYYYMMDDTHHmmss[Z]
  const y = parseInt(raw.slice(0, 4));
  const mo = parseInt(raw.slice(4, 6)) - 1;
  const d = parseInt(raw.slice(6, 8));
  const h = parseInt(raw.slice(9, 11));
  const m = parseInt(raw.slice(11, 13));

  return raw.endsWith("Z")
    ? new Date(Date.UTC(y, mo, d, h, m))
    : new Date(y, mo, d, h, m);
}

function parseICS(ics: string): CalendarMeeting[] {
  const content = unfold(ics);
  const lines = content.split(/\r?\n/);
  const meetings: CalendarMeeting[] = [];
  const now = new Date();

  let inEvent = false;
  let summary = "";
  let description = "";
  let dtstart = "";
  let uid = "";
  let url = "";
  const attendees: string[] = [];

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      summary = "";
      description = "";
      dtstart = "";
      uid = "";
      url = "";
      attendees.length = 0;
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;
      if (!isRelevant(summary, description)) continue;

      const date = parseICalDate(dtstart);
      const workstreamIds = mapToWorkstreams(summary, description);
      if (workstreamIds.length === 0) continue;

      meetings.push({
        id: uid || `${summary}-${dtstart}`,
        title: summary || "(No title)",
        date: date.toISOString().split("T")[0],
        attendees: attendees.join(", ") || "See calendar",
        calendarLink: url || "https://calendar.google.com",
        workstreamIds,
        isPast: date < now,
        source: "calendar",
      });
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith("SUMMARY:")) {
      summary = line.slice(8).replace(/\\,/g, ",").replace(/\\n/g, " ");
    } else if (line.startsWith("DESCRIPTION:")) {
      description = line.slice(12).replace(/\\n/g, " ").replace(/\\,/g, ",");
    } else if (line.startsWith("DTSTART")) {
      dtstart = line.slice(line.indexOf(":") + 1);
    } else if (line.startsWith("UID:")) {
      uid = line.slice(4);
    } else if (line.startsWith("URL:")) {
      url = line.slice(4);
    } else if (line.startsWith("ATTENDEE")) {
      const cn = line.match(/CN=([^;:]+)/);
      const self = line.includes("PARTSTAT=ACCEPTED") || line.includes("CUTYPE=INDIVIDUAL");
      if (cn && !line.toLowerCase().includes(process.env.CALENDAR_OWNER_EMAIL?.toLowerCase() ?? "__noop__")) {
        attendees.push(cn[1].replace(/^"(.*)"$/, "$1"));
      }
    }
  }

  // Sort: upcoming by date asc, past by date desc
  return meetings.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    if (!a.isPast && !b.isPast) return da - db;
    if (a.isPast && b.isPast) return db - da;
    return 0;
  });
}

export async function getCalendarMeetings(): Promise<CalendarMeeting[]> {
  const icalUrl = process.env.GOOGLE_CALENDAR_ICAL_URL;
  if (!icalUrl) return [];

  try {
    const res = await fetch(icalUrl, {
      next: { revalidate: 300 }, // refresh every 5 minutes
    });
    if (!res.ok) return [];
    const ics = await res.text();
    return parseICS(ics);
  } catch (err) {
    console.error("iCal fetch failed:", err);
    return [];
  }
}
