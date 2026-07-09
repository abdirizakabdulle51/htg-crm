"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  FileText,
  GitBranch,
  KeyRound,
  Link2,
  ListChecks,
  Mail,
  Map,
  PlayCircle,
  RadioTower,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
} from "lucide-react";

type IntegrationStatus = "Connected" | "Pending Configuration" | "Error";
type IntegrationHealth = "Healthy" | "Warning" | "Error";
type IntegrationPriority = "Critical" | "High" | "Medium" | "Low";
type IntegrationType =
  | "Tenant Source"
  | "Authentication"
  | "Database"
  | "Cache"
  | "Messaging"
  | "Analytics"
  | "Communication"
  | "Productivity";

type Integration = {
  health: IntegrationHealth;
  lastSync: string;
  name: string;
  priority: IntegrationPriority;
  records: string;
  status: IntegrationStatus;
  type: IntegrationType;
};

type MappingRow = {
  crmField: string;
  hcsField: string;
  ownership: string;
  status: string;
};

const integrations: Integration[] = [
  {
    name: "Huawei HCS",
    type: "Tenant Source",
    status: "Pending Configuration",
    lastSync: "Not connected",
    records: "0 tenants",
    health: "Warning",
    priority: "Critical",
  },
  {
    name: "Keycloak",
    type: "Authentication",
    status: "Connected",
    lastSync: "Live",
    records: "18 users",
    health: "Healthy",
    priority: "High",
  },
  {
    name: "PostgreSQL",
    type: "Database",
    status: "Connected",
    lastSync: "Live",
    records: "CRM database",
    health: "Healthy",
    priority: "High",
  },
  {
    name: "Redis",
    type: "Cache",
    status: "Connected",
    lastSync: "Live",
    records: "Session/cache layer",
    health: "Healthy",
    priority: "Medium",
  },
  {
    name: "RabbitMQ",
    type: "Messaging",
    status: "Connected",
    lastSync: "Live",
    records: "Event queue",
    health: "Healthy",
    priority: "Medium",
  },
  {
    name: "ClickHouse",
    type: "Analytics",
    status: "Connected",
    lastSync: "Live",
    records: "Analytics store",
    health: "Healthy",
    priority: "Medium",
  },
  {
    name: "Email",
    type: "Communication",
    status: "Pending Configuration",
    lastSync: "Not connected",
    records: "0 messages",
    health: "Warning",
    priority: "Medium",
  },
  {
    name: "Calendar",
    type: "Productivity",
    status: "Pending Configuration",
    lastSync: "Not connected",
    records: "0 events",
    health: "Warning",
    priority: "Low",
  },
];

const hcsWorkflow = [
  "Configure HCS credentials",
  "Test connection",
  "Preview tenant data",
  "Map fields",
  "Run first tenant sync",
  "Review imported tenants",
  "Resolve conflicts",
  "Enable scheduled sync",
];

const readinessChecklist = [
  "HCS API base URL received",
  "Authentication method confirmed",
  "Tenant endpoint confirmed",
  "Tenant fields documented",
  "Owner mapping available",
  "Sector/service fields available",
  "Renewal fields available",
  "Test credentials received",
];

const mappingRows: MappingRow[] = [
  { hcsField: "Tenant/account name", crmField: "tenants.name", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Tenant/account ID", crmField: "tenants.huawei_account_id", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Country", crmField: "country_id", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Account Owner", crmField: "account_manager_id", ownership: "Conflict Review", status: "Pending" },
  { hcsField: "Industry", crmField: "sector_id", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Billing", crmField: "ARR / MRR", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Renewal", crmField: "renewal_date", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Services", crmField: "tenant_services", ownership: "HCS-owned", status: "Pending" },
  { hcsField: "Usage Trend", crmField: "health_score / risk_score", ownership: "HCS-owned", status: "Pending" },
];

const syncHistory = [
  { date: "Today", event: "Keycloak authentication verified" },
  { date: "Today", event: "PostgreSQL connected" },
  { date: "Yesterday", event: "RabbitMQ queue checked" },
  { date: "This Week", event: "Huawei HCS integration requirements requested" },
];

const informationNeeded = [
  "HCS API Base URL",
  "Authentication Method",
  "Test Credentials",
  "Tenant List Endpoint",
  "Usage/Billing Endpoint",
  "Contract/Renewal Endpoint",
  "Pagination Format",
  "Rate Limits",
  "Updated-Since Support",
  "Sample Tenant Response JSON",
  "Sample Billing Response JSON",
  "Sample Contract Response JSON",
  "Error Response Format",
];

const versionTwoCards = [
  "HCS Field Mapper",
  "Manual Tenant Sync",
  "Scheduled Sync Rules",
  "Sync Error Repair",
  "Credential Vault",
  "Integration Logs",
  "Conflict Resolution Queue",
  "Preview Import Results",
];

const statusOptions = ["All", "Connected", "Pending Configuration", "Error"];
const typeOptions = [
  "All",
  "Tenant Source",
  "Authentication",
  "Database",
  "Cache",
  "Messaging",
  "Analytics",
  "Communication",
  "Productivity",
];
const healthOptions = ["All", "Healthy", "Warning", "Error"];
const priorityOptions = ["All", "Critical", "High", "Medium", "Low"];

function statusClass(status: IntegrationStatus | IntegrationHealth | IntegrationPriority | string) {
  if (status === "Connected" || status === "Healthy" || status === "High") return "bg-emerald-100 text-emerald-700";
  if (status === "Pending Configuration" || status === "Warning" || status === "Medium" || status === "Pending") {
    return "bg-amber-100 text-amber-700";
  }
  if (status === "Error" || status === "Critical") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function integrationIcon(type: IntegrationType) {
  if (type === "Tenant Source") return RadioTower;
  if (type === "Authentication") return KeyRound;
  if (type === "Database") return Database;
  if (type === "Cache") return ServerCog;
  if (type === "Messaging") return GitBranch;
  if (type === "Analytics") return ListChecks;
  if (type === "Communication") return Mail;
  return CalendarDays;
}

function KpiCard({
  icon: Icon,
  label,
  subtext,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  subtext?: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-5 text-2xl font-bold text-gray-900">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-gray-500">{subtext}</p> : null}
    </div>
  );
}

function Badge({ className, label }: { className: string; label: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function DisabledButton({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400"
      disabled
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
  options: string[];
  value: string;
}) {
  return (
    <select
      aria-label={label}
      className="h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {label}: {option}
        </option>
      ))}
    </select>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminIntegrationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const connectedIntegrations = integrations.filter((item) => item.status === "Connected").length;
  const pendingIntegrations = integrations.filter((item) => item.status === "Pending Configuration").length;
  const criticalIntegrations = integrations.filter((item) => item.priority === "Critical").length;
  const healthyServices = integrations.filter((item) => item.health === "Healthy").length;
  const warningServices = integrations.filter((item) => item.health === "Warning").length;
  const criticalOffline = integrations.some((item) => item.priority === "Critical" && item.status === "Error");
  const hcsPending = integrations.some((item) => item.name === "Huawei HCS" && item.status === "Pending Configuration");
  const integrationHealth: IntegrationHealth = criticalOffline ? "Error" : hcsPending || warningServices > 0 ? "Warning" : "Healthy";
  const mostUrgentIntegration =
    integrations.find((item) => item.priority === "Critical" && item.status !== "Connected")?.name ??
    integrations.find((item) => item.health !== "Healthy")?.name ??
    "None";
  const warnings = [
    ...(hcsPending ? ["Huawei HCS pending configuration"] : []),
    ...integrations
      .filter((item) => item.status === "Pending Configuration" && item.name !== "Huawei HCS")
      .map((item) => `${item.name} integration pending`),
    "Tenant synchronization has never been executed",
  ];

  const filteredIntegrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return integrations.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesType = typeFilter === "All" || item.type === typeFilter;
      const matchesHealth = healthFilter === "All" || item.health === healthFilter;
      const matchesPriority = priorityFilter === "All" || item.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesType && matchesHealth && matchesPriority;
    });
  }, [healthFilter, priorityFilter, search, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Integrations</h1>
        <p className="mt-2 text-sm text-gray-500">
          Monitor external services, authentication, messaging, storage, analytics, and platform connectivity.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Link2} label="Total Integrations" value={integrations.length.toString()} />
        <KpiCard icon={CheckCircle2} label="Connected Integrations" value={connectedIntegrations.toString()} />
        <KpiCard icon={Clock} label="Pending Integrations" value={pendingIntegrations.toString()} />
        <KpiCard icon={AlertTriangle} label="Critical Integrations" value={criticalIntegrations.toString()} />
        <KpiCard icon={ShieldCheck} label="Healthy Services" value={healthyServices.toString()} />
        <KpiCard icon={AlertTriangle} label="Warning Services" value={warningServices.toString()} />
        <KpiCard icon={ServerCog} label="Last Successful Sync" value="Live" />
        <KpiCard icon={Settings2} label="Integration Health" subtext="Huawei HCS pending" value={integrationHealth} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Integration Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Integration actions will be enabled after backend workflow APIs are connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledButton icon={Link2} label="Connect Integration" />
            <DisabledButton icon={Settings2} label="Configure HCS" />
            <DisabledButton icon={CheckCircle2} label="Test Connection" />
            <DisabledButton icon={PlayCircle} label="Run Sync" />
            <DisabledButton icon={FileText} label="View Logs" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Integration</p>
            <h2 className="mt-2 text-2xl font-semibold text-gray-900">Huawei HCS</h2>
            <p className="mt-3 text-sm text-gray-600">Import real HTG Clouds tenant data into CRM dashboards.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge className={statusClass("Pending Configuration")} label="Pending Configuration" />
              <Badge className={statusClass("Critical")} label="Critical Priority" />
              <Badge className={statusClass("Warning")} label="Warning" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledButton icon={Settings2} label="Configure HCS" />
            <DisabledButton icon={CheckCircle2} label="Test Connection" />
            <DisabledButton icon={Eye} label="Preview Data" />
            <DisabledButton icon={Map} label="Map Fields" />
            <DisabledButton icon={PlayCircle} label="Run Sync" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {hcsWorkflow.map((step, index) => (
            <div className="rounded-lg border border-amber-200 bg-white p-4" key={step}>
              <span className="rounded-full bg-[#0A9599]/10 px-2.5 py-1 text-xs font-semibold text-[#0A9599]">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-semibold text-gray-900">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_210px_210px_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              className="h-11 w-full rounded-md border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search integration, type, or status"
              value={search}
            />
          </label>
          <FilterSelect label="Status" onChange={setStatusFilter} options={statusOptions} value={statusFilter} />
          <FilterSelect label="Type" onChange={setTypeFilter} options={typeOptions} value={typeFilter} />
          <FilterSelect label="Health" onChange={setHealthFilter} options={healthOptions} value={healthFilter} />
          <FilterSelect label="Priority" onChange={setPriorityFilter} options={priorityOptions} value={priorityFilter} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Integrations Table</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3">Integration</th>
                <th className="py-3">Type</th>
                <th className="py-3">Status</th>
                <th className="py-3">Health</th>
                <th className="py-3">Priority</th>
                <th className="py-3">Last Sync</th>
                <th className="py-3">Records</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIntegrations.map((item) => {
                const Icon = integrationIcon(item.type);

                return (
                  <tr className="border-b border-gray-100 last:border-0" key={item.name}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-[#0A9599]" />
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-700">{item.type}</td>
                    <td className="py-4">
                      <Badge className={statusClass(item.status)} label={item.status} />
                    </td>
                    <td className="py-4">
                      <Badge className={statusClass(item.health)} label={item.health} />
                    </td>
                    <td className="py-4">
                      <Badge className={statusClass(item.priority)} label={item.priority} />
                    </td>
                    <td className="py-4 text-gray-700">{item.lastSync}</td>
                    <td className="py-4 text-gray-700">{item.records}</td>
                    <td className="py-4">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400" disabled type="button">
                          Configure
                        </button>
                        <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400" disabled type="button">
                          Test
                        </button>
                        <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400" disabled type="button">
                          Sync
                        </button>
                        <button className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-400" disabled type="button">
                          Logs
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredIntegrations.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-gray-500" colSpan={8}>
                    No integrations match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">HCS Sync Readiness Checklist</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {readinessChecklist.map((item) => (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4" key={item}>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-gray-800">{item}</span>
              </div>
              <Badge className={statusClass("Pending")} label="Pending" />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Field Mapping Preview</h2>
        <p className="mt-1 text-sm text-gray-500">Read-only preview of how Huawei HCS fields will map into CRM records.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3">HCS Field</th>
                <th className="py-3">CRM Field</th>
                <th className="py-3">Ownership</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.map((row) => (
                <tr className="border-b border-gray-100 last:border-0" key={`${row.hcsField}-${row.crmField}`}>
                  <td className="py-4 font-semibold text-gray-900">{row.hcsField}</td>
                  <td className="py-4 text-gray-700">{row.crmField}</td>
                  <td className="py-4 text-gray-700">{row.ownership}</td>
                  <td className="py-4">
                    <Badge className={statusClass(row.status)} label={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Sync History</h2>
        <div className="mt-5 space-y-4 border-l border-gray-200 pl-5">
          {syncHistory.map((item) => (
            <div className="relative" key={`${item.date}-${item.event}`}>
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.date}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{item.event}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Integration Warnings</h2>
        <div className="mt-5 space-y-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-700" key={warning}>
                {warning}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              All integrations are healthy.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Integration Admin Coach</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CoachMetric label="Integration Health" value={integrationHealth} />
          <CoachMetric label="Most Urgent Integration" value={mostUrgentIntegration} />
          <CoachMetric label="Connected Services" value={connectedIntegrations.toString()} />
          <CoachMetric label="Pending Services" value={pendingIntegrations.toString()} />
          <CoachMetric
            label="Recommendation"
            value="Prioritize Huawei HCS configuration so real tenant data can replace demo data across all dashboards."
          />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Information Needed From Chen</h2>
        <p className="mt-1 text-sm text-gray-500">
          These details are required before the Huawei HCS connector can be implemented safely.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {informationNeeded.map((item) => (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4" key={item}>
              <FileText className="h-4 w-4 text-[#0A9599]" />
              <span className="text-sm font-semibold text-gray-800">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">
          Integration workflows will be enabled after secure backend APIs and credential management are connected.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {versionTwoCards.map((card) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-left text-sm text-gray-400"
              disabled
              key={card}
              type="button"
            >
              <span className="font-semibold text-gray-500">{card}</span>
              <span className="mt-2 block">Coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
