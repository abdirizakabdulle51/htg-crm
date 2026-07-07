"use client";

import type { ReactNode } from "react";
import { CalendarDays, Mail, MessageSquareText, NotebookPen, Phone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const activities = [
  {
    date: "Today",
    time: "09:00",
    type: "Call",
    customer: "Kenya Tenant 04",
    subject: "Renewal discussion",
    outcome: "Follow-up scheduled",
  },
  {
    date: "Today",
    time: "11:15",
    type: "Meeting",
    customer: "Kenya Tenant 03",
    subject: "Banking Expansion proposal",
    outcome: "Proposal under review",
  },
  {
    date: "Yesterday",
    time: "15:20",
    type: "Email",
    customer: "Kenya Tenant 01",
    subject: "Cloud Security quotation",
    outcome: "Awaiting response",
  },
  {
    date: "Yesterday",
    time: "10:30",
    type: "Note",
    customer: "Kenya Tenant 02",
    subject: "Customer requested DR pricing",
    outcome: "Opportunity identified",
  },
  {
    date: "This Week",
    time: "13:00",
    type: "Call",
    customer: "Kenya Tenant 05",
    subject: "Quarterly account review",
    outcome: "Healthy account",
  },
];

const dateGroups = ["Today", "Yesterday", "This Week"];

function typeClass(type: string) {
  if (type === "Call") return "bg-blue-100 text-blue-700";
  if (type === "Meeting") return "bg-teal-100 text-teal-700";
  if (type === "Email") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-700";
}

function statusClass(status: string) {
  if (status === "Needs Follow-up") return "bg-yellow-100 text-yellow-700";
  if (status === "Healthy") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function requiresFollowUp(outcome: string) {
  return ["Follow-up", "Awaiting", "Proposal"].some((keyword) => outcome.includes(keyword));
}

function nextAction(activity: (typeof activities)[number]) {
  if (activity.type === "Call" && activity.outcome.includes("Follow-up")) return "Schedule follow-up";
  if (activity.outcome.includes("Proposal")) return "Prepare proposal";
  if (activity.outcome.includes("Awaiting")) return "Send quotation";
  return "Update opportunity";
}

function relationshipStatus(outcome: string) {
  if (outcome.includes("Follow-up") || outcome.includes("Awaiting")) return "Needs Follow-up";
  if (outcome === "Healthy account") return "Healthy";
  return "Active";
}

function followUpPriority(date: string) {
  if (date === "Today") return "High";
  if (date === "Yesterday") return "Medium";
  return "Low";
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

export default function AMActivitiesPage() {
  const todayActivities = activities.filter((activity) => activity.date === "Today");
  const followUpQueue = activities.filter((activity) => requiresFollowUp(activity.outcome));
  const mostActiveCustomer =
    activities.reduce(
      (best, activity) => {
        const count = activities.filter((item) => item.customer === activity.customer).length;
        return count > best.count ? { customer: activity.customer, count } : best;
      },
      { customer: activities[0].customer, count: 0 },
    ).customer;
  const lastMeeting = activities.find((activity) => activity.type === "Meeting");
  const customerSummaries = Array.from(new Set(activities.map((activity) => activity.customer))).map((customer) => {
    const customerActivities = activities.filter((activity) => activity.customer === customer);
    const lastActivity = customerActivities[0];

    return {
      customer,
      lastActivity: `${lastActivity.date} ${lastActivity.time}`,
      count: customerActivities.length,
      lastOutcome: lastActivity.outcome,
      status: relationshipStatus(lastActivity.outcome),
    };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">My Activities</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track customer meetings, calls, emails, notes, and relationship history.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Today's Activities" value={todayActivities.length} icon={<CalendarDays className="h-5 w-5" />} />
        <KpiCard title="Calls" value={activities.filter((activity) => activity.type === "Call").length} icon={<Phone className="h-5 w-5" />} />
        <KpiCard title="Meetings" value={activities.filter((activity) => activity.type === "Meeting").length} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Emails" value={activities.filter((activity) => activity.type === "Email").length} icon={<Mail className="h-5 w-5" />} />
        <KpiCard title="Notes" value={activities.filter((activity) => activity.type === "Note").length} icon={<NotebookPen className="h-5 w-5" />} />
        <KpiCard title="Follow-ups Required" value={followUpQueue.length} icon={<MessageSquareText className="h-5 w-5" />} />
      </div>

      <Section title="Today's Activities">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Time</th>
                <th className="py-3 pr-4 font-semibold">Type</th>
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Subject</th>
                <th className="py-3 pr-4 font-semibold">Outcome</th>
                <th className="py-3 pr-4 font-semibold">Next Action</th>
              </tr>
            </thead>
            <tbody>
              {todayActivities.map((activity) => (
                <tr key={`${activity.time}-${activity.customer}`} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4 font-semibold text-gray-900">{activity.time}</td>
                  <td className="py-4 pr-4">
                    <Badge className={typeClass(activity.type)}>{activity.type}</Badge>
                  </td>
                  <td className="py-4 pr-4 text-gray-600">{activity.customer}</td>
                  <td className="py-4 pr-4 font-semibold text-gray-900">{activity.subject}</td>
                  <td className="py-4 pr-4 text-gray-600">{activity.outcome}</td>
                  <td className="py-4 pr-4 text-[#0A9599] font-semibold">{nextAction(activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Activity Timeline">
        <div className="space-y-8">
          {dateGroups.map((group) => (
            <div key={group}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group}</h3>
              <div className="mt-4 border-l-2 border-teal-100 pl-5">
                {activities
                  .filter((activity) => activity.date === group)
                  .map((activity) => (
                    <div key={`${activity.date}-${activity.time}-${activity.customer}`} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-semibold text-gray-900">{activity.time}</span>
                          <Badge className={typeClass(activity.type)}>{activity.type}</Badge>
                          <span className="text-sm text-gray-600">{activity.customer}</span>
                        </div>
                        <p className="mt-2 font-semibold text-gray-900">{activity.subject}</p>
                        <p className="mt-1 text-sm text-gray-600">{activity.outcome}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Customer Interaction Summary">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Last Activity</th>
                <th className="py-3 pr-4 font-semibold">Activity Count</th>
                <th className="py-3 pr-4 font-semibold">Last Outcome</th>
                <th className="py-3 pr-4 font-semibold">Relationship Status</th>
              </tr>
            </thead>
            <tbody>
              {customerSummaries.map((summary) => (
                <tr key={summary.customer} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4 font-semibold text-gray-900">{summary.customer}</td>
                  <td className="py-4 pr-4 text-gray-600">{summary.lastActivity}</td>
                  <td className="py-4 pr-4 text-gray-600">{summary.count}</td>
                  <td className="py-4 pr-4 text-gray-600">{summary.lastOutcome}</td>
                  <td className="py-4 pr-4">
                    <Badge className={statusClass(summary.status)}>{summary.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Follow-up Queue">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Activity</th>
                <th className="py-3 pr-4 font-semibold">Required Follow-up</th>
                <th className="py-3 pr-4 font-semibold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {followUpQueue.map((activity) => {
                const priority = followUpPriority(activity.date);

                return (
                  <tr key={`${activity.customer}-${activity.subject}`} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4 font-semibold text-gray-900">{activity.customer}</td>
                    <td className="py-4 pr-4 text-gray-600">{activity.subject}</td>
                    <td className="py-4 pr-4 text-[#0A9599] font-semibold">{nextAction(activity)}</td>
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

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Activity Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <CoachMetric label="Most Active Customer" value={mostActiveCustomer} />
          <CoachMetric label="Last Meeting" value={lastMeeting?.subject ?? "No meeting logged"} />
          <CoachMetric label="Pending Follow-ups" value={followUpQueue.length} />
        </div>
        <div className="mt-5 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
          Follow up Kenya Tenant 04 before Friday and continue progressing Banking Expansion.
        </div>
      </section>
    </div>
  );
}
