"use client";

import type { ReactNode } from "react";
import { AlertTriangle, BriefcaseBusiness, CalendarClock, CheckSquare, Clock, ListTodo } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const tasks = [
  {
    title: "Follow up Banking Expansion proposal",
    customer: "Kenya Tenant 03",
    type: "Opportunity",
    priority: "High",
    due: "Today",
    status: "Open",
  },
  {
    title: "Schedule renewal meeting",
    customer: "Kenya Tenant 04",
    type: "Renewal",
    priority: "High",
    due: "Today",
    status: "Open",
  },
  {
    title: "Update opportunity stages",
    customer: "Banking Expansion",
    type: "Pipeline",
    priority: "Medium",
    due: "Tomorrow",
    status: "Open",
  },
  {
    title: "Send customer health summary",
    customer: "Kenya Tenant 01",
    type: "Customer",
    priority: "Medium",
    due: "This Week",
    status: "Open",
  },
  {
    title: "Review cross-sell proposal",
    customer: "Kenya Tenant 02",
    type: "Expansion",
    priority: "Low",
    due: "This Week",
    status: "Open",
  },
];

const taskTypes = ["Opportunity", "Renewal", "Customer", "Expansion", "Pipeline"];
const priorityRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function typeClass(type: string) {
  if (type === "Opportunity") return "bg-teal-100 text-teal-700";
  if (type === "Renewal") return "bg-blue-100 text-blue-700";
  if (type === "Pipeline") return "bg-purple-100 text-purple-700";
  if (type === "Expansion") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-700";
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

function TaskTable({ items, showActions = false }: { items: typeof tasks; showActions?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
            <th className="py-3 pr-4 font-semibold">Task</th>
            <th className="py-3 pr-4 font-semibold">Customer</th>
            {!showActions && <th className="py-3 pr-4 font-semibold">Type</th>}
            <th className="py-3 pr-4 font-semibold">Priority</th>
            {showActions ? <th className="py-3 pr-4 font-semibold">Type</th> : <th className="py-3 pr-4 font-semibold">Due</th>}
            <th className="py-3 pr-4 font-semibold">Status</th>
            {showActions && <th className="py-3 text-right font-semibold">Action</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((task) => (
            <tr key={`${task.title}-${task.customer}`} className="border-b border-gray-100 last:border-0">
              <td className="py-4 pr-4 font-semibold text-gray-900">{task.title}</td>
              <td className="py-4 pr-4 text-gray-600">{task.customer}</td>
              {!showActions && (
                <td className="py-4 pr-4">
                  <Badge className={typeClass(task.type)}>{task.type}</Badge>
                </td>
              )}
              <td className="py-4 pr-4">
                <Badge className={priorityClass(task.priority)}>{task.priority}</Badge>
              </td>
              {showActions ? (
                <td className="py-4 pr-4">
                  <Badge className={typeClass(task.type)}>{task.type}</Badge>
                </td>
              ) : (
                <td className="py-4 pr-4 text-gray-600">{task.due}</td>
              )}
              <td className="py-4 pr-4">
                <Badge className="bg-blue-100 text-blue-700">{task.status}</Badge>
              </td>
              {showActions && (
                <td className="py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled
                      className="rounded-md bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 disabled:opacity-70"
                    >
                      Complete
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
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

export default function AMTasksPage() {
  const sortedTasks = [...tasks].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const todayTasks = sortedTasks.filter((task) => task.due === "Today");
  const upcomingTasks = sortedTasks.filter((task) => task.due === "Tomorrow" || task.due === "This Week");
  const dueThisWeek = tasks.filter((task) => ["Today", "Tomorrow", "This Week"].includes(task.due));
  const firstHighPriority = sortedTasks.find((task) => task.priority === "High") ?? sortedTasks[0];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">My Tasks</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage daily sales activities, follow-ups, renewals, and customer commitments.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Open Tasks" value={tasks.length} icon={<ListTodo className="h-5 w-5" />} />
        <KpiCard title="Due Today" value={todayTasks.length} icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard title="High Priority" value={tasks.filter((task) => task.priority === "High").length} icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard title="Due This Week" value={dueThisWeek.length} icon={<Clock className="h-5 w-5" />} />
        <KpiCard title="Opportunity Tasks" value={tasks.filter((task) => task.type === "Opportunity").length} icon={<BriefcaseBusiness className="h-5 w-5" />} />
        <KpiCard title="Renewal Tasks" value={tasks.filter((task) => task.type === "Renewal").length} icon={<CheckSquare className="h-5 w-5" />} />
      </div>

      <Section title="Today's Tasks">
        <TaskTable items={todayTasks} showActions />
      </Section>

      <Section title="All Tasks">
        <TaskTable items={sortedTasks} />
      </Section>

      <Section title="Task Distribution">
        <div className="grid gap-4 md:grid-cols-5">
          {taskTypes.map((type) => (
            <div key={type} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">{type}</p>
              <p className="mt-3 text-2xl font-bold text-gray-900">{tasks.filter((task) => task.type === type).length}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Upcoming Work">
        <TaskTable items={upcomingTasks} />
      </Section>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Productivity Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <CoachMetric label="Today's workload" value={`${todayTasks.length} tasks`} />
          <CoachMetric label="Highest Priority" value={firstHighPriority.title} />
          <CoachMetric label="Most Important Customer" value={firstHighPriority.customer} />
          <CoachMetric label="Open workload" value={`${tasks.length} total tasks`} />
        </div>
        <div className="mt-5 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
          Complete renewal work before proposal follow-ups today.
        </div>
      </section>
    </div>
  );
}
