"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ServerCog,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

const kpis = [
  { label: "Total Users", value: "18", icon: Users },
  { label: "Active Users", value: "17", icon: CheckCircle2 },
  { label: "Countries Configured", value: "4", icon: ServerCog },
  { label: "Roles Configured", value: "5", icon: ShieldCheck },
  { label: "Unassigned Customers", value: "2", icon: UserCog },
  { label: "Pending Approval Rules", value: "1", icon: Clock },
  { label: "System Health", value: "Healthy", icon: CheckCircle2 },
  { label: "Configuration Progress", value: "92%", icon: ServerCog },
];

const checklist = [
  { label: "Keycloak configured", status: "Healthy" },
  { label: "PostgreSQL connected", status: "Healthy" },
  { label: "Redis running", status: "Healthy" },
  { label: "RabbitMQ connected", status: "Healthy" },
  { label: "ClickHouse connected", status: "Healthy" },
  { label: "Frontend connected", status: "Healthy" },
  { label: "Backend connected", status: "Healthy" },
  { label: "Approval workflow pending", status: "Warning" },
  { label: "Email integration pending", status: "Pending" },
];

const roles = [
  { role: "CEO", users: 1, status: "Active" },
  { role: "Head of Business", users: 1, status: "Active" },
  { role: "Country GM", users: 4, status: "Active" },
  { role: "Account Manager", users: 8, status: "Active" },
  { role: "Admin", users: 2, status: "Active" },
];

const qualityAlerts = [
  "2 customers have no Account Manager assignment",
  "1 renewal date missing",
  "3 opportunities missing probability",
  "No duplicate customers detected",
];

const healthRows = [
  { component: "Database", status: "Healthy", version: "Online" },
  { component: "Redis", status: "Healthy", version: "Online" },
  { component: "RabbitMQ", status: "Healthy", version: "Online" },
  { component: "ClickHouse", status: "Healthy", version: "Online" },
  { component: "Keycloak", status: "Healthy", version: "Online" },
  { component: "Backend API", status: "Healthy", version: "Online" },
  { component: "Frontend", status: "Healthy", version: "Online" },
];

const activity = [
  { date: "Today", event: "Created Account Manager" },
  { date: "Today", event: "Assigned customer to Kenya GM" },
  { date: "Yesterday", event: "Updated Kenya Q3 Target" },
  { date: "Yesterday", event: "Modified Role Permissions" },
  { date: "This Week", event: "Imported customer list" },
];

const actions = [
  "Add User",
  "Configure Role",
  "Assign Customer",
  "Set Target",
  "Configure Integration",
  "Import Customers",
];

function statusClass(status: string) {
  if (status === "Healthy" || status === "Active") return "bg-emerald-100 text-emerald-700";
  if (status === "Warning") return "bg-amber-100 text-amber-700";
  if (status === "Offline") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-[#0A9599]">System control</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">System Administration Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage CRM users, configuration, permissions, integrations, audit readiness, and operational health.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" key={label}>
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-gray-500">{label}</p>
              <Icon className="h-4 w-4 text-[#0A9599]" />
            </div>
            <p className="mt-8 text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">System Setup Checklist</h2>
        <p className="mt-1 text-sm text-gray-500">Configuration readiness across identity, data, services, and integrations.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checklist.map((item) => (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4" key={item.label}>
              <div className="flex items-center gap-3">
                {item.status === "Healthy" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : item.status === "Warning" ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-800">{item.label}</span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(item.status)}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">User & Role Summary</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 text-right font-medium">Users</th>
                  <th className="py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((row) => (
                  <tr className="border-b last:border-0" key={row.role}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{row.role}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{row.users}</td>
                    <td className="py-3 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Data Quality Alerts</h2>
          <div className="mt-5 grid gap-3">
            {qualityAlerts.map((alert) => (
              <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4" key={alert}>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">{alert}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">System Health</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Component</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {healthRows.map((row) => (
                <tr className="border-b last:border-0" key={row.component}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.component}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td className="py-3 text-gray-500">{row.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Recent Admin Activity</h2>
          <div className="mt-5 space-y-0 border-l border-gray-200 pl-5">
            {activity.map((item) => (
              <div className="relative pb-5 last:pb-0" key={`${item.date}-${item.event}`}>
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
                <p className="text-xs uppercase tracking-wide text-gray-500">{item.date}</p>
                <p className="mt-1 text-sm font-medium text-gray-900">{item.event}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0A9599]">Admin Coach</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <CoachMetric label="System Health" value="Healthy" />
            <CoachMetric label="Configuration Progress" value="92%" />
            <CoachMetric label="Users Configured" value="18" />
            <CoachMetric label="Most Urgent Issue" value="Approval workflow pending" />
          </div>
          <div className="mt-4 rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm text-gray-700">
            Complete approval workflow configuration before onboarding additional users.
          </div>
        </section>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Quick Actions</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {actions.map((action) => (
            <button
              className="rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
              disabled
              key={action}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Administrative write actions will be enabled after backend workflow integration.
        </p>
      </section>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
    </div>
  );
}
