"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  LockKeyhole,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
} from "lucide-react";

type AuditModule =
  | "Users"
  | "Roles & Permissions"
  | "Assignments"
  | "Targets"
  | "Approvals"
  | "Integrations"
  | "Authentication"
  | "Data Management"
  | "Settings";

type AuditResult = "Success" | "Failed" | "Partial";
type AuditRole = "Admin" | "CEO" | "Head of Business" | "Country GM" | "Account Manager" | "System";
type AuditSeverity = "Info" | "Warning" | "Critical";
type AuditHealth = "Healthy" | "Warning" | "Critical";

type AuditEvent = {
  action: string;
  actor: string;
  actorEmail: string;
  country: string;
  module: AuditModule;
  resource: string;
  result: AuditResult;
  role: AuditRole;
  severity: AuditSeverity;
  source: string;
  summary: string;
  timestamp: string;
};

const auditEvents: AuditEvent[] = [
  {
    timestamp: "Today 09:14",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Updated user role",
    resource: "gm@test.com",
    module: "Users",
    country: "Kenya",
    source: "Admin Console",
    result: "Success",
    severity: "Info",
    summary: "Country GM role confirmed for Kenya workspace access.",
  },
  {
    timestamp: "Today 08:52",
    actor: "System",
    actorEmail: "system@htg-crm.local",
    role: "System",
    action: "Keycloak login completed",
    resource: "ceo@test.com",
    module: "Authentication",
    country: "All",
    source: "Keycloak",
    result: "Success",
    severity: "Info",
    summary: "CEO user authenticated successfully through Keycloak.",
  },
  {
    timestamp: "Today 08:40",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Configured country target",
    resource: "Kenya Q3 2026 target",
    module: "Targets",
    country: "Kenya",
    source: "Targets Console",
    result: "Success",
    severity: "Info",
    summary: "Kenya target configuration remains aligned with Q3 demo data.",
  },
  {
    timestamp: "Today 07:35",
    actor: "System",
    actorEmail: "system@htg-crm.local",
    role: "System",
    action: "Huawei HCS sync failed",
    resource: "Huawei HCS tenant import",
    module: "Integrations",
    country: "All",
    source: "Integration Worker",
    result: "Failed",
    severity: "Critical",
    summary: "Huawei HCS sync could not start because production API credentials are not configured.",
  },
  {
    timestamp: "Yesterday 16:20",
    actor: "Head Business",
    actorEmail: "hob@test.com",
    role: "Head of Business",
    action: "Reviewed commercial risks",
    resource: "Commercial Risk Center",
    module: "Data Management",
    country: "All",
    source: "HoB Workspace",
    result: "Success",
    severity: "Info",
    summary: "HoB reviewed company-wide commercial risk exposure.",
  },
  {
    timestamp: "Yesterday 15:42",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Updated assignment readiness",
    resource: "Djibouti GM assignment",
    module: "Assignments",
    country: "Djibouti",
    source: "Admin Console",
    result: "Partial",
    severity: "Warning",
    summary: "Djibouti assignment readiness remains partial until AM ownership is connected.",
  },
  {
    timestamp: "Yesterday 11:10",
    actor: "System",
    actorEmail: "system@htg-crm.local",
    role: "System",
    action: "Failed login attempt",
    resource: "unknown-admin@example.com",
    module: "Authentication",
    country: "All",
    source: "Keycloak",
    result: "Failed",
    severity: "Warning",
    summary: "Unknown user attempted to authenticate against the CRM realm.",
  },
  {
    timestamp: "This Week 10:05",
    actor: "Country GM",
    actorEmail: "gm@test.com",
    role: "Country GM",
    action: "Viewed Kenya tenants",
    resource: "Kenya customer portfolio",
    module: "Data Management",
    country: "Kenya",
    source: "GM Workspace",
    result: "Success",
    severity: "Info",
    summary: "Country GM viewed Kenya customer data with country-scoped access.",
  },
  {
    timestamp: "This Week 09:30",
    actor: "Account Manager",
    actorEmail: "am@test.com",
    role: "Account Manager",
    action: "Opened renewal center",
    resource: "Kenya Tenant 04 renewal",
    module: "Approvals",
    country: "Kenya",
    source: "AM Workspace",
    result: "Success",
    severity: "Info",
    summary: "Account Manager reviewed personal renewal actions.",
  },
  {
    timestamp: "This Week 08:15",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Changed approval threshold",
    resource: "Commercial discount approval",
    module: "Approvals",
    country: "All",
    source: "Admin Console",
    result: "Success",
    severity: "Info",
    summary: "Approval threshold configuration was reviewed for Version 1 readiness.",
  },
  {
    timestamp: "This Week 07:50",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Reviewed role permissions",
    resource: "Admin workspace permissions",
    module: "Roles & Permissions",
    country: "All",
    source: "Admin Console",
    result: "Success",
    severity: "Info",
    summary: "Role permissions were reviewed for workspace access governance.",
  },
  {
    timestamp: "This Week 07:10",
    actor: "CRM Admin",
    actorEmail: "admin@test.com",
    role: "Admin",
    action: "Updated system setting",
    resource: "Audit retention policy",
    module: "Settings",
    country: "All",
    source: "Admin Console",
    result: "Partial",
    severity: "Warning",
    summary: "Audit retention policy is documented but backend enforcement is pending.",
  },
];

const moduleOptions = [
  "All",
  "Users",
  "Roles & Permissions",
  "Assignments",
  "Targets",
  "Approvals",
  "Integrations",
  "Authentication",
  "Data Management",
  "Settings",
] as const;

const resultOptions = ["All", "Success", "Failed", "Partial"] as const;
const severityOptions = ["All", "Info", "Warning", "Critical"] as const;
const roleOptions = ["All", "Admin", "CEO", "Head of Business", "Country GM", "Account Manager", "System"] as const;
const countryOptions = ["All", "Kenya", "Somalia", "Ethiopia", "Djibouti"] as const;
const timeOptions = ["All", "Today", "Yesterday", "This Week"] as const;

const governanceCards = [
  { title: "Audit Logging", value: "Enabled", description: "User and system events are captured." },
  { title: "Retention Policy", value: "90 Days", description: "Version 1 retention window." },
  { title: "User Activity Tracking", value: "Enabled", description: "Workspace activity is tracked." },
  { title: "Configuration Change Tracking", value: "Enabled", description: "Admin configuration changes are monitored." },
  { title: "Integration Logging", value: "Enabled", description: "External service events are recorded." },
  { title: "Authentication Logging", value: "Enabled", description: "Keycloak sign-in events are monitored." },
  { title: "Export Policy", value: "Pending", description: "Controlled audit export workflow is pending." },
  { title: "Tamper Protection", value: "Planned", description: "Immutable audit storage is planned." },
];

const versionTwoItems = [
  "Event Detail Drawer",
  "Investigation Workspace",
  "Audit Export Builder",
  "Retention Policy Editor",
  "Security Alert Rules",
  "Immutable Audit Storage",
  "Change Comparison Viewer",
  "Rollback Request Workflow",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function healthClass(value: AuditHealth) {
  if (value === "Healthy") return "bg-green-100 text-green-700";
  if (value === "Warning") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function resultClass(value: AuditResult) {
  if (value === "Success") return "bg-green-100 text-green-700";
  if (value === "Failed") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

function severityClass(value: AuditSeverity) {
  if (value === "Info") return "bg-blue-100 text-blue-700";
  if (value === "Warning") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function statusClass(value: string) {
  if (value === "Enabled" || value === "Normal") return "bg-green-100 text-green-700";
  if (value === "Pending" || value === "Watch") return "bg-yellow-100 text-yellow-700";
  if (value === "Review") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function getTimeGroup(timestamp: string) {
  if (timestamp.startsWith("Today")) return "Today";
  if (timestamp.startsWith("Yesterday")) return "Yesterday";
  return "This Week";
}

function getTimeLabel(timestamp: string) {
  return timestamp.replace("Today ", "").replace("Yesterday ", "").replace("This Week ", "");
}

function getAuditHealth(events: AuditEvent[]): AuditHealth {
  if (events.some((event) => event.severity === "Critical" && event.result === "Failed")) return "Critical";
  if (events.some((event) => event.severity === "Warning" || event.result === "Failed" || event.result === "Partial")) {
    return "Warning";
  }
  return "Healthy";
}

function getRecommendedResponse(event: AuditEvent) {
  if (event.action === "Huawei HCS sync failed") return "Complete HCS configuration before retrying sync.";
  if (event.action === "Failed login attempt") return "Review account status and authentication logs.";
  if (event.module === "Assignments") return "Confirm ownership setup and assignment readiness.";
  return "Review event context and confirm the expected governance owner.";
}

function getActorRisk(events: AuditEvent[]) {
  if (events.some((event) => event.result === "Failed" || event.severity === "Critical")) return "Review";
  if (events.some((event) => event.result === "Partial" || event.severity === "Warning")) return "Watch";
  return "Normal";
}

function DisabledButton({ children, icon: Icon }: { children: string; icon?: ComponentType<{ className?: string }> }) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400 disabled:cursor-not-allowed"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-5 w-5 text-[#0A9599]" />
      </div>
      <p className="mt-5 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599]/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {label}: {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminAuditPage() {
  const [countryFilter, setCountryFilter] = useState<(typeof countryOptions)[number]>("All");
  const [moduleFilter, setModuleFilter] = useState<(typeof moduleOptions)[number]>("All");
  const [resultFilter, setResultFilter] = useState<(typeof resultOptions)[number]>("All");
  const [roleFilter, setRoleFilter] = useState<(typeof roleOptions)[number]>("All");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<(typeof severityOptions)[number]>("All");
  const [timeFilter, setTimeFilter] = useState<(typeof timeOptions)[number]>("All");

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return auditEvents.filter((event) => {
      const matchesSearch =
        !query ||
        [
          event.action,
          event.actor,
          event.actorEmail,
          event.country,
          event.module,
          event.resource,
          event.summary,
        ].some((value) => value.toLowerCase().includes(query));

      return (
        matchesSearch &&
        (moduleFilter === "All" || event.module === moduleFilter) &&
        (resultFilter === "All" || event.result === resultFilter) &&
        (severityFilter === "All" || event.severity === severityFilter) &&
        (roleFilter === "All" || event.role === roleFilter) &&
        (countryFilter === "All" || event.country === countryFilter) &&
        (timeFilter === "All" || getTimeGroup(event.timestamp) === timeFilter)
      );
    });
  }, [countryFilter, moduleFilter, resultFilter, roleFilter, search, severityFilter, timeFilter]);

  const successfulEvents = auditEvents.filter((event) => event.result === "Success").length;
  const failedEvents = auditEvents.filter((event) => event.result === "Failed").length;
  const criticalEvents = auditEvents.filter((event) => event.severity === "Critical").length;
  const userChanges = auditEvents.filter((event) => event.module === "Users").length;
  const configurationChanges = auditEvents.filter((event) =>
    ["Roles & Permissions", "Assignments", "Targets", "Approvals", "Settings"].includes(event.module),
  ).length;
  const integrationEvents = auditEvents.filter((event) => event.module === "Integrations").length;
  const auditHealth = getAuditHealth(auditEvents);

  const criticalReviewEvents = auditEvents.filter((event) => event.severity === "Critical" || event.result === "Failed");

  const moduleSummary = (moduleOptions.filter((module) => module !== "All") as AuditModule[]).map((module) => {
    const events = auditEvents.filter((event) => event.module === module);
    return {
      failed: events.filter((event) => event.result === "Failed").length,
      health: events.length ? getAuditHealth(events) : "Healthy",
      module,
      successful: events.filter((event) => event.result === "Success").length,
      total: events.length,
    };
  });

  const actorSummary = Array.from(new Set(auditEvents.map((event) => event.actor))).map((actor) => {
    const events = auditEvents.filter((event) => event.actor === actor);
    const lastEvent = events[0];
    return {
      actor,
      failed: events.filter((event) => event.result === "Failed").length,
      lastActivity: lastEvent?.timestamp ?? "-",
      risk: getActorRisk(events),
      role: lastEvent?.role ?? "System",
      successful: events.filter((event) => event.result === "Success").length,
      total: events.length,
    };
  });

  const mostActiveActor = actorSummary.reduce((top, actor) => (actor.total > top.total ? actor : top), actorSummary[0]);
  const mostCriticalEvent = criticalReviewEvents[0]?.action ?? "No critical audit event";

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Audit Logs</h1>
        <p className="mt-2 text-sm text-gray-500">
          Review user activity, system events, configuration history, and security auditing.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={History} label="Total Events" value={formatNumber(auditEvents.length)} />
        <KpiCard icon={CheckCircle2} label="Successful Events" value={formatNumber(successfulEvents)} />
        <KpiCard icon={ShieldAlert} label="Failed Events" value={formatNumber(failedEvents)} />
        <KpiCard icon={AlertTriangle} label="Critical Events" value={formatNumber(criticalEvents)} />
        <KpiCard icon={UserCog} label="User Changes" value={formatNumber(userChanges)} />
        <KpiCard icon={FileText} label="Configuration Changes" value={formatNumber(configurationChanges)} />
        <KpiCard icon={LockKeyhole} label="Integration Events" value={formatNumber(integrationEvents)} />
        <KpiCard icon={ShieldCheck} label="Audit Health" value={auditHealth} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Audit Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Audit write actions are disabled until secure backend audit workflows are connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledButton icon={Download}>Export Audit Log</DisabledButton>
            <DisabledButton icon={ShieldAlert}>Open Investigation</DisabledButton>
            <DisabledButton icon={Eye}>View Event Details</DisabledButton>
            <DisabledButton icon={Archive}>Archive Logs</DisabledButton>
            <DisabledButton icon={Clock}>Configure Retention</DisabledButton>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-[#0A9599]" />
          <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <span className="sr-only">Search audit events</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search actor, email, action, resource, module, country, or summary"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599]/20"
            />
          </label>
          <FilterSelect label="Module" options={moduleOptions} value={moduleFilter} onChange={(value) => setModuleFilter(value as typeof moduleFilter)} />
          <FilterSelect label="Result" options={resultOptions} value={resultFilter} onChange={(value) => setResultFilter(value as typeof resultFilter)} />
          <FilterSelect label="Severity" options={severityOptions} value={severityFilter} onChange={(value) => setSeverityFilter(value as typeof severityFilter)} />
          <FilterSelect label="Role" options={roleOptions} value={roleFilter} onChange={(value) => setRoleFilter(value as typeof roleFilter)} />
          <FilterSelect label="Country" options={countryOptions} value={countryFilter} onChange={(value) => setCountryFilter(value as typeof countryFilter)} />
          <FilterSelect label="Time Range" options={timeOptions} value={timeFilter} onChange={(value) => setTimeFilter(value as typeof timeFilter)} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Audit Event Table</h2>
            <p className="mt-1 text-sm text-gray-500">Filtered read-only system activity and governance events.</p>
          </div>
          <p className="text-sm font-medium text-gray-500">{filteredEvents.length} events shown</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[1280px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Timestamp</th>
                <th className="py-3 pr-4">Actor</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Resource</th>
                <th className="py-3 pr-4">Module</th>
                <th className="py-3 pr-4">Country</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3 pr-4">Result</th>
                <th className="py-3 pr-4">Severity</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEvents.map((event) => (
                <tr key={`${event.timestamp}-${event.action}-${event.resource}`}>
                  <td className="py-4 pr-4 font-medium text-gray-900">{event.timestamp}</td>
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-gray-900">{event.actor}</p>
                    <p className="text-xs text-gray-500">{event.actorEmail}</p>
                  </td>
                  <td className="py-4 pr-4 text-gray-600">{event.role}</td>
                  <td className="py-4 pr-4 font-medium text-gray-900">{event.action}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.resource}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.module}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.country}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.source}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${resultClass(event.result)}`}>{event.result}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityClass(event.severity)}`}>{event.severity}</span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <button type="button" disabled className="rounded-md border border-gray-200 p-2 text-gray-400 disabled:cursor-not-allowed">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button type="button" disabled className="rounded-md border border-gray-200 p-2 text-gray-400 disabled:cursor-not-allowed">
                        <ShieldAlert className="h-4 w-4" />
                      </button>
                      <button type="button" disabled className="rounded-md border border-gray-200 p-2 text-gray-400 disabled:cursor-not-allowed">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-gray-500" colSpan={11}>
                    No audit events match the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Recent Critical Events</h2>
        <p className="mt-1 text-sm text-gray-500">Failed or critical events requiring administrative review.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[920px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Timestamp</th>
                <th className="py-3 pr-4">Event</th>
                <th className="py-3 pr-4">Resource</th>
                <th className="py-3 pr-4">Source</th>
                <th className="py-3 pr-4">Result</th>
                <th className="py-3">Recommended Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {criticalReviewEvents.map((event) => (
                <tr key={`${event.timestamp}-${event.action}`}>
                  <td className="py-4 pr-4 font-medium text-gray-900">{event.timestamp}</td>
                  <td className="py-4 pr-4 text-gray-700">{event.action}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.resource}</td>
                  <td className="py-4 pr-4 text-gray-600">{event.source}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${resultClass(event.result)}`}>{event.result}</span>
                  </td>
                  <td className="py-4 text-gray-700">{getRecommendedResponse(event)}</td>
                </tr>
              ))}
              {criticalReviewEvents.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-gray-500" colSpan={6}>
                    No critical audit events require review.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Activity By Module</h2>
          <p className="mt-1 text-sm text-gray-500">Governance coverage across core CRM modules.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[680px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Module</th>
                  <th className="py-3 pr-4">Event Count</th>
                  <th className="py-3 pr-4">Successful</th>
                  <th className="py-3 pr-4">Failed</th>
                  <th className="py-3">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {moduleSummary.map((row) => (
                  <tr key={row.module}>
                    <td className="py-4 pr-4 font-semibold text-gray-900">{row.module}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.total}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.successful}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.failed}</td>
                    <td className="py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${healthClass(row.health)}`}>{row.health}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Actor Activity Summary</h2>
          <p className="mt-1 text-sm text-gray-500">User and system activity grouped by actor.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4">Actor</th>
                  <th className="py-3 pr-4">Role</th>
                  <th className="py-3 pr-4">Events</th>
                  <th className="py-3 pr-4">Successful</th>
                  <th className="py-3 pr-4">Failed</th>
                  <th className="py-3 pr-4">Last Activity</th>
                  <th className="py-3">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actorSummary.map((row) => (
                  <tr key={row.actor}>
                    <td className="py-4 pr-4 font-semibold text-gray-900">{row.actor}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.role}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.total}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.successful}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.failed}</td>
                    <td className="py-4 pr-4 text-gray-600">{row.lastActivity}</td>
                    <td className="py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.risk)}`}>{row.risk}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Audit Timeline</h2>
        <p className="mt-1 text-sm text-gray-500">Newest audit events grouped by operational period.</p>
        <div className="mt-6 space-y-6">
          {timeOptions
            .filter((option) => option !== "All")
            .map((group) => {
              const events = auditEvents.filter((event) => getTimeGroup(event.timestamp) === group);
              return (
                <div key={group}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{group}</h3>
                  <div className="mt-3 space-y-4 border-l-2 border-[#0A9599]/20 pl-5">
                    {events.map((event) => (
                      <div key={`${event.timestamp}-${event.resource}`} className="relative rounded-lg border border-gray-200 bg-white p-4">
                        <span className="absolute -left-[29px] top-5 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{getTimeLabel(event.timestamp)}</p>
                            <p className="mt-1 font-semibold text-gray-900">{event.action}</p>
                            <p className="text-sm text-gray-500">
                              {event.actor} - {event.resource}
                            </p>
                          </div>
                          <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${resultClass(event.result)}`}>{event.result}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Audit Governance</h2>
        <p className="mt-1 text-sm text-gray-500">Current Version 1 audit controls and readiness status.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {governanceCards.map((card) => (
            <div key={card.title} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900">{card.title}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(card.value)}`}>{card.value}</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Audit Admin Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <CoachMetric label="Audit Health" value={auditHealth} />
          <CoachMetric label="Most Active Actor" value={mostActiveActor?.actor ?? "No actor activity"} />
          <CoachMetric label="Failed Events" value={String(failedEvents)} />
          <CoachMetric label="Most Critical Event" value={mostCriticalEvent} />
        </div>
        <div className="mt-4 rounded-lg border border-[#0A9599]/20 bg-white p-4 text-sm font-medium text-gray-700">
          Complete Huawei HCS sync configuration before enabling scheduled imports, then review failed authentication events.
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflows</h2>
        <p className="mt-1 text-sm text-gray-500">
          Advanced audit workflows will be enabled after backend audit APIs and secure event storage are connected.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {versionTwoItems.map((item) => (
            <button
              key={item}
              type="button"
              disabled
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm font-semibold text-gray-400 disabled:cursor-not-allowed"
            >
              {item}
              <span className="mt-2 block text-xs font-normal text-gray-400">Coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
