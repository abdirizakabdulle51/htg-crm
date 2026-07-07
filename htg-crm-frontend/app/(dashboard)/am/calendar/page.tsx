"use client";

import type { ReactNode } from "react";
import { CalendarClock, CalendarDays, Clock, FileText, Phone, Repeat2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const events = [
  {
    time: "09:00",
    date: "Today",
    type: "Renewal Meeting",
    customer: "Kenya Tenant 04",
    duration: "30 min",
    status: "Scheduled",
  },
  {
    time: "11:00",
    date: "Today",
    type: "Proposal Review",
    customer: "Kenya Tenant 03",
    duration: "45 min",
    status: "Scheduled",
  },
  {
    time: "14:00",
    date: "Today",
    type: "Customer Call",
    customer: "Kenya Tenant 01",
    duration: "30 min",
    status: "Scheduled",
  },
  {
    time: "10:00",
    date: "Tomorrow",
    type: "Account Review",
    customer: "Kenya Tenant 05",
    duration: "60 min",
    status: "Scheduled",
  },
  {
    time: "15:00",
    date: "This Week",
    type: "Renewal Planning",
    customer: "Kenya Tenant 02",
    duration: "45 min",
    status: "Scheduled",
  },
];

const dateGroups = ["Today", "Tomorrow", "This Week"];
const allocationTypes = ["Renewal", "Call", "Proposal", "Review", "Planning"];

function parseMinutes(duration: string) {
  const minutes = Number.parseInt(duration, 10);
  return Number.isNaN(minutes) ? 0 : minutes;
}

function dateRank(date: string) {
  return dateGroups.indexOf(date);
}

function typeClass(type: string) {
  if (type.includes("Renewal")) return "bg-red-100 text-red-700";
  if (type === "Proposal Review") return "bg-yellow-100 text-yellow-700";
  if (type === "Account Review") return "bg-blue-100 text-blue-700";
  if (type === "Customer Call") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-700";
}

function priorityForType(type: string) {
  if (type.includes("Renewal")) return "High";
  if (type === "Proposal Review" || type === "Account Review") return "Medium";
  return "Low";
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function allocationType(type: string) {
  if (type === "Renewal Planning") return "Planning";
  if (type.includes("Renewal")) return "Renewal";
  if (type === "Customer Call") return "Call";
  if (type === "Proposal Review") return "Proposal";
  if (type === "Account Review") return "Review";
  return "Review";
}

function KpiCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="h-32 p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-[#0A9599]">{icon}</div>
        </div>
        <div className="mt-8 text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CoachMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AMCalendarPage() {
  const sortedEvents = [...events].sort((a, b) => dateRank(a.date) - dateRank(b.date) || a.time.localeCompare(b.time));
  const todayEvents = sortedEvents.filter((event) => event.date === "Today");
  const firstMeeting = todayEvents[0];
  const lastMeeting = todayEvents[todayEvents.length - 1];
  const busyMinutes = todayEvents.reduce((sum, event) => sum + parseMinutes(event.duration), 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Calendar</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage customer meetings, renewals, follow-ups, and daily schedule.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Today's Meetings" value={todayEvents.length} icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard title="Tomorrow's Meetings" value={events.filter((event) => event.date === "Tomorrow").length} icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard title="This Week" value={events.length} icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Renewal Meetings" value={events.filter((event) => event.type.includes("Renewal")).length} icon={<Repeat2 className="h-5 w-5" />} />
        <KpiCard title="Customer Calls" value={events.filter((event) => event.type === "Customer Call").length} icon={<Phone className="h-5 w-5" />} />
        <KpiCard title="Proposal Reviews" value={events.filter((event) => event.type === "Proposal Review").length} icon={<FileText className="h-5 w-5" />} />
      </div>

      <Section title="Today's Schedule">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Time</th>
                <th className="py-3 pr-4 font-semibold">Meeting</th>
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Duration</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {todayEvents.map((event) => (
                <tr key={`${event.time}-${event.customer}`} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4 font-semibold text-gray-900">{event.time}</td>
                  <td className="py-4 pr-4">
                    <Badge className={typeClass(event.type)}>{event.type}</Badge>
                  </td>
                  <td className="py-4 pr-4 text-gray-600">{event.customer}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.duration}</td>
                  <td className="py-4 pr-4">
                    <Badge className="bg-blue-100 text-blue-700">{event.status}</Badge>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled
                        className="rounded-md bg-teal-100 px-3 py-1 text-xs font-semibold text-[#0A9599] disabled:opacity-70"
                      >
                        Join
                      </button>
                      <button
                        type="button"
                        disabled
                        className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-70"
                      >
                        Reschedule
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Calendar Timeline">
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <div key={group}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group}</h3>
              <div className="mt-4 border-l-2 border-teal-100 pl-5">
                {sortedEvents
                  .filter((event) => event.date === group)
                  .map((event) => (
                    <div key={`${event.date}-${event.time}-${event.customer}`} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-gray-900">{event.time}</span>
                          <Badge className={typeClass(event.type)}>{event.type}</Badge>
                          <span className="text-sm text-gray-600">{event.customer}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">Duration: {event.duration}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Upcoming Customer Meetings">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Meeting</th>
                <th className="py-3 pr-4 font-semibold">Date</th>
                <th className="py-3 pr-4 font-semibold">Duration</th>
                <th className="py-3 pr-4 font-semibold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((event) => {
                const priority = priorityForType(event.type);

                return (
                  <tr key={`${event.customer}-${event.type}-${event.date}`} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4 font-semibold text-gray-900">{event.customer}</td>
                    <td className="py-4 pr-4 text-gray-600">{event.type}</td>
                    <td className="py-4 pr-4 text-gray-600">{event.date}</td>
                    <td className="py-4 pr-4 text-gray-600">{event.duration}</td>
                    <td className="py-4 pr-4">
                      <Badge className={priorityClass(priority)}>{priority}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Time Allocation">
        <div className="grid gap-4 md:grid-cols-5">
          {allocationTypes.map((type) => {
            const typeEvents = events.filter((event) => allocationType(event.type) === type);
            const totalMinutes = typeEvents.reduce((sum, event) => sum + parseMinutes(event.duration), 0);

            return (
              <div key={type} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-500">{type}</p>
                <p className="mt-3 text-2xl font-bold text-gray-900">{typeEvents.length}</p>
                <p className="mt-1 text-sm font-semibold text-[#0A9599]">{totalMinutes} min</p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Daily Planner</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <CoachMetric label="First Meeting" value={firstMeeting ? `${firstMeeting.time} - ${firstMeeting.customer}` : "No meetings"} />
          <CoachMetric label="Last Meeting" value={lastMeeting ? `${lastMeeting.time} - ${lastMeeting.customer}` : "No meetings"} />
          <CoachMetric label="Busy Time" value={`${busyMinutes} min`} />
        </div>
        <div className="mt-5 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
          Prepare the Kenya Tenant 04 renewal before today&apos;s proposal review.
        </div>
      </section>
    </div>
  );
}
