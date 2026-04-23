import workstreamsData from "@/data/workstreams.json";
import { Workstream } from "@/app/types";
import { getCalendarMeetings, CalendarMeeting } from "@/lib/googleCalendar";
import StatusBadge from "@/components/StatusBadge";
import ProgressBar from "@/components/ProgressBar";

const milestoneIcon: Record<string, string> = {
  complete: "✓",
  in_progress: "▶",
  not_started: "○",
};

const milestoneText: Record<string, string> = {
  complete: "text-emerald-400",
  in_progress: "text-blue-400",
  not_started: "text-slate-500",
};

const priorityColor: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-slate-400",
};

function CalendarMeetingCard({ m }: { m: CalendarMeeting }) {
  return (
    <div className="bg-slate-900/40 rounded-xl border border-blue-800/30 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-blue-400 shrink-0">📅</span>
          <p className="font-semibold text-white text-sm truncate">{m.title}</p>
        </div>
        <span className="text-xs text-blue-300 bg-blue-900/30 border border-blue-700/40 px-2 py-0.5 rounded-full shrink-0">
          {m.date}
        </span>
      </div>
      {m.attendees && m.attendees !== "No external attendees" && (
        <p className="text-xs text-slate-500 mb-2 truncate">Attendees: {m.attendees}</p>
      )}
      <a
        href={m.calendarLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:underline"
      >
        Open in Google Calendar →
      </a>
    </div>
  );
}

export default async function WorkstreamsPage() {
  const workstreams = workstreamsData as Workstream[];
  const calendarMeetings = await getCalendarMeetings();

  const calendarConnected = !!process.env.GOOGLE_CALENDAR_ICAL_URL;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workstreams</h1>
          <p className="text-slate-400 text-sm mt-1">Detailed status for each program workstream.</p>
        </div>
        {calendarConnected ? (
          <span className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/40 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Google Calendar connected
          </span>
        ) : (
          <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-full">
            📅 Calendar not connected — add GOOGLE_CALENDAR_ICAL_URL in Vercel
          </span>
        )}
      </div>

      {workstreams.map((ws) => {
        const wsCalMeetings = calendarMeetings.filter((m) =>
          m.workstreamIds.includes(ws.id)
        );
        const upcomingCal = wsCalMeetings.filter((m) => !m.isPast);
        const pastCal = wsCalMeetings.filter((m) => m.isPast);

        return (
          <section
            key={ws.id}
            id={ws.id}
            className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  <span className="mr-2">{ws.icon}</span>{ws.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1 max-w-2xl">{ws.description}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <StatusBadge status={ws.status} size="md" />
                <span className="text-slate-400 text-sm">
                  Owner: <span className="text-white">{ws.owner}</span>
                </span>
              </div>
            </div>

            {/* Progress */}
            <div className="px-6 py-4 border-b border-slate-700/30">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Overall Progress</span>
                <span className="text-white font-medium">{ws.percentComplete}%</span>
              </div>
              <ProgressBar
                percent={ws.percentComplete}
                color={ws.status === "green" ? "emerald" : ws.status === "yellow" ? "amber" : "blue"}
              />
            </div>

            {/* Milestones + Blockers + Updates */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/40">
              <div className="lg:col-span-2 p-6">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">Milestones</h3>
                <div className="space-y-2">
                  {ws.milestones.map((m) => (
                    <div key={m.id} className="flex items-start gap-3">
                      <span className={`text-sm mt-0.5 font-bold ${milestoneText[m.status]}`}>
                        {milestoneIcon[m.status]}
                      </span>
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <span className={`text-sm ${m.status === "complete" ? "text-slate-400 line-through" : m.status === "in_progress" ? "text-white" : "text-slate-400"}`}>
                          {m.name}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-500">{m.dueDate}</span>
                          <div className="mt-0.5">
                            <StatusBadge status={m.status} size="xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Blockers</h3>
                  {ws.blockers.length === 0 ? (
                    <p className="text-emerald-400 text-sm">No blockers 🎉</p>
                  ) : (
                    <div className="space-y-3">
                      {ws.blockers.map((b) => (
                        <div key={b.id} className="bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                          <p className="text-sm text-red-300">{b.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-slate-400">
                            <span>Owner: {b.owner}</span>
                            <span>{b.raisedDate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Latest Update</h3>
                  {ws.updates.length === 0 ? (
                    <p className="text-slate-500 text-sm">No updates yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {ws.updates.slice(0, 2).map((u, i) => (
                        <div key={i} className="text-sm">
                          <span className="text-slate-500 text-xs block mb-0.5">{u.date}</span>
                          <span className="text-slate-300">{u.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* High Priority Actions */}
            <div className="border-t border-slate-700/40 px-6 py-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">High Priority Actions</h3>
              {ws.actions.filter((a) => a.priority === "high" && (a.status === "open" || a.status === "in_progress")).length === 0 ? (
                <p className="text-emerald-400 text-sm">No high priority open actions.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-700/40">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-800/60">
                        {["Action", "Owner", "Due Date", "Priority", "Status"].map((h) => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 py-2.5">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {ws.actions
                        .filter((a) => a.priority === "high" && (a.status === "open" || a.status === "in_progress"))
                        .map((a) => (
                          <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 text-sm text-white">{a.title}</td>
                            <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">{a.owner}</td>
                            <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">{a.dueDate}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold uppercase ${priorityColor[a.priority]}`}>{a.priority}</span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={a.status} size="xs" />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Meetings */}
            <div className="border-t border-slate-700/40 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-700/40">

              {/* Upcoming Meetings */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Upcoming Meetings</h3>
                  {upcomingCal.length > 0 && (
                    <span className="text-xs text-blue-400 bg-blue-900/20 border border-blue-700/30 px-2 py-0.5 rounded-full">
                      {upcomingCal.length} from calendar
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {/* Calendar events */}
                  {upcomingCal.map((m) => <CalendarMeetingCard key={m.id} m={m} />)}
                  {/* Manual entries */}
                  {ws.meetings.upcoming.map((m) => (
                    <div key={m.id} className="bg-slate-900/40 rounded-xl border border-slate-700/40 p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="font-semibold text-white text-sm">{m.title}</p>
                        <span className="text-xs text-blue-400 bg-blue-900/30 border border-blue-700/40 px-2 py-0.5 rounded-full shrink-0">{m.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">Attendees: {m.attendees}</p>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Goals</p>
                          <ul className="space-y-1">
                            {m.goals.map((g, i) => (
                              <li key={i} className="text-xs text-slate-300 flex gap-2">
                                <span className="text-blue-400 shrink-0">→</span>{g}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Decision Points</p>
                          <ul className="space-y-1">
                            {m.decisionPoints.map((d, i) => (
                              <li key={i} className="text-xs text-slate-300 flex gap-2">
                                <span className="text-amber-400 shrink-0">◆</span>{d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingCal.length === 0 && ws.meetings.upcoming.length === 0 && (
                    <p className="text-slate-500 text-sm">No upcoming meetings.</p>
                  )}
                </div>
              </div>

              {/* Past Meetings */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Past Meetings</h3>
                  {pastCal.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-full">
                      {pastCal.length} from calendar
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                  {/* Calendar past events */}
                  {pastCal.map((m) => <CalendarMeetingCard key={m.id} m={m} />)}
                  {/* Manual entries */}
                  {ws.meetings.past.map((m) => (
                    <div key={m.id} className="bg-slate-900/40 rounded-xl border border-slate-700/40 p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-semibold text-white text-sm">{m.title}</p>
                        <span className="text-xs text-slate-400 bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-full shrink-0">{m.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Attendees: {m.attendees}</p>
                      {(m as { calendarLink?: string }).calendarLink && (
                        <a href={(m as { calendarLink?: string }).calendarLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline block mb-3">Open in Google Calendar →</a>
                      )}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Decisions Made</p>
                          <ul className="space-y-1">
                            {m.decisions.map((d, i) => (
                              <li key={i} className="text-xs text-slate-300 flex gap-2">
                                <span className="text-emerald-400 shrink-0">✓</span>{d}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Action Items</p>
                          <ul className="space-y-1.5">
                            {m.actionItems.map((a, i) => (
                              <li key={i} className="text-xs text-slate-300 bg-slate-800/60 rounded-lg px-3 py-2">
                                <p>{a.title}</p>
                                <p className="text-slate-500 mt-0.5">Owner: {a.owner} · Due: {a.dueDate}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pastCal.length === 0 && ws.meetings.past.length === 0 && (
                    <p className="text-slate-500 text-sm">No past meetings recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
