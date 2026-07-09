"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Search,
  ServerCog,
  Settings2,
  Shuffle,
  Upload,
  Wrench,
} from "lucide-react";

type IssueType =
  | "Duplicates"
  | "Missing Renewal"
  | "Missing Sector"
  | "Missing Probability"
  | "Missing Owner"
  | "Synchronization";

type IssueStatus = "Healthy" | "Warning" | "Error";
type Severity = "Healthy" | "Warning" | "Critical";

type DataIssue = {
  issue: string;
  affected: number;
  severity: Severity;
  action: string;
  type: IssueType;
  status: IssueStatus;
  record: string;
};

type SyncStatus = {
  system: string;
  status: "Healthy" | "Warning" | "Error";
  lastSync: string;
  records: string;
};

const summary = {
  customers: 59,
  activeCustomers: 57,
  archivedCustomers: 2,
  duplicateCustomers: 1,
  missingRenewals: 4,
  missingSector: 2,
  missingProbability: 3,
  missingOwner: 2,
  syncErrors: 1,
  lastSync: "2 minutes ago",
  recordsImported: 59,
  dataHealth: 97,
};

const dataIssues: DataIssue[] = [
  {
    issue: "Duplicate Customers",
    affected: 1,
    severity: "Warning",
    action: "Merge duplicates",
    type: "Duplicates",
    status: "Warning",
    record: "Kenya Tenant 03",
  },
  {
    issue: "Missing Renewal Dates",
    affected: 4,
    severity: "Warning",
    action: "Complete renewal dates",
    type: "Missing Renewal",
    status: "Warning",
    record: "Hormuud Telecom",
  },
  {
    issue: "Missing Sector",
    affected: 2,
    severity: "Warning",
    action: "Update sector",
    type: "Missing Sector",
    status: "Warning",
    record: "Healthcare Tenant",
  },
  {
    issue: "Missing Probability",
    affected: 3,
    severity: "Warning",
    action: "Update probability",
    type: "Missing Probability",
    status: "Warning",
    record: "Banking Expansion",
  },
  {
    issue: "Missing Owner",
    affected: 2,
    severity: "Critical",
    action: "Assign Account Manager",
    type: "Missing Owner",
    status: "Error",
    record: "Djibouti Tenant 02",
  },
  {
    issue: "Synchronization Errors",
    affected: 1,
    severity: "Critical",
    action: "Review synchronization",
    type: "Synchronization",
    status: "Error",
    record: "Huawei HCS sync",
  },
];

const syncStatuses: SyncStatus[] = [
  { system: "Huawei HCS", status: "Healthy", lastSync: "2 minutes ago", records: "59" },
  { system: "PostgreSQL", status: "Healthy", lastSync: "Live", records: "59" },
  { system: "Keycloak", status: "Healthy", lastSync: "Today", records: "18 Users" },
  { system: "RabbitMQ", status: "Healthy", lastSync: "Live", records: "Running" },
  { system: "ClickHouse", status: "Healthy", lastSync: "Live", records: "Running" },
  { system: "Redis", status: "Healthy", lastSync: "Live", records: "Running" },
];

const importHistory = [
  { date: "Today", event: "Imported 59 customers", status: "Success" },
  { date: "Yesterday", event: "Updated opportunities", status: "Success" },
  { date: "This Week", event: "Synchronized customer ownership", status: "Success" },
];

const workflowCards = [
  "Duplicate Merge Wizard",
  "Bulk Data Repair",
  "Manual Synchronization",
  "Import Wizard",
  "Data Validation Rules",
  "Automatic Cleanup",
];

const issueOptions = [
  "All",
  "Duplicates",
  "Missing Renewal",
  "Missing Sector",
  "Missing Probability",
  "Missing Owner",
  "Synchronization",
];

const statusOptions = ["All", "Healthy", "Warning", "Error"];

const formatter = new Intl.NumberFormat("en-US");

function severityClass(severity: Severity) {
  if (severity === "Critical") return "bg-red-100 text-red-700";
  if (severity === "Warning") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function statusClass(status: IssueStatus | SyncStatus["status"]) {
  if (status === "Error") return "bg-red-100 text-red-700";
  if (status === "Warning") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function KpiCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: ComponentType<{ className?: string }>;
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

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function DisabledAction({
  label,
  icon: Icon,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      disabled
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
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

export default function AdminDataPage() {
  const [search, setSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const missingFields =
    summary.missingRenewals + summary.missingSector + summary.missingProbability + summary.missingOwner;
  const ownerAssigned = summary.customers - summary.missingOwner;
  const mostCriticalIssue = dataIssues.find((issue) => issue.severity === "Critical")?.issue ?? "None";

  const filteredIssues = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dataIssues.filter((issue) => {
      const matchesSearch =
        !query ||
        issue.issue.toLowerCase().includes(query) ||
        issue.record.toLowerCase().includes(query) ||
        issue.action.toLowerCase().includes(query);
      const matchesIssue = issueFilter === "All" || issue.type === issueFilter;
      const matchesStatus = statusFilter === "All" || issue.status === statusFilter;

      return matchesSearch && matchesIssue && matchesStatus;
    });
  }, [issueFilter, search, statusFilter]);

  const warnings = dataIssues.filter((issue) => issue.severity !== "Healthy");

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Data Management</h1>
        <p className="mt-2 text-sm text-gray-500">
          Monitor CRM data quality, synchronization, imports, duplicates, and data integrity.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Customers" value={formatter.format(summary.customers)} icon={Database} />
        <KpiCard label="Active Customers" value={formatter.format(summary.activeCustomers)} icon={CheckCircle2} />
        <KpiCard label="Archived Customers" value={formatter.format(summary.archivedCustomers)} icon={Database} />
        <KpiCard label="Duplicate Records" value={formatter.format(summary.duplicateCustomers)} icon={Shuffle} />
        <KpiCard label="Missing Fields" value={formatter.format(missingFields)} icon={AlertTriangle} />
        <KpiCard label="Synchronization Errors" value={formatter.format(summary.syncErrors)} icon={ServerCog} />
        <KpiCard label="Last Synchronization" value={summary.lastSync} icon={Clock} />
        <KpiCard label="Data Health Score" value={`${summary.dataHealth}%`} subtext="Healthy" icon={CheckCircle2} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Data Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Data management actions will be enabled after backend workflow integration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledAction label="Import Data" icon={Upload} />
            <DisabledAction label="Export Data" icon={Download} />
            <DisabledAction label="Run Synchronization" icon={ServerCog} />
            <DisabledAction label="Merge Duplicates" icon={Shuffle} />
            <DisabledAction label="Repair Records" icon={Wrench} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Customer / Opportunity / Record"
              className="h-11 w-full rounded-md border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
            />
          </label>
          <FilterSelect label="Issue Type" value={issueFilter} options={issueOptions} onChange={setIssueFilter} />
          <FilterSelect label="Status" value={statusFilter} options={statusOptions} onChange={setStatusFilter} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Data Quality Overview</h2>
        <p className="mt-1 text-sm text-gray-500">CRM record issues and recommended data repair actions.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3">Issue</th>
                <th className="py-3">Affected Records</th>
                <th className="py-3">Severity</th>
                <th className="py-3">Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue) => (
                <tr key={issue.issue} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 font-semibold text-gray-900">{issue.issue}</td>
                  <td className="py-4 text-gray-700">{issue.affected}</td>
                  <td className="py-4">
                    <Badge label={issue.severity} className={severityClass(issue.severity)} />
                  </td>
                  <td className="py-4 text-gray-700">{issue.action}</td>
                </tr>
              ))}
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-sm text-gray-500">
                    No CRM data quality issues detected.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Customer Data Health</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Customers" value={formatter.format(summary.customers)} icon={Database} />
          <KpiCard label="Duplicates" value={formatter.format(summary.duplicateCustomers)} icon={Shuffle} />
          <KpiCard label="Missing Sector" value={formatter.format(summary.missingSector)} icon={AlertTriangle} />
          <KpiCard label="Missing Renewal" value={formatter.format(summary.missingRenewals)} icon={Clock} />
          <KpiCard label="Owner Assigned" value={formatter.format(ownerAssigned)} icon={CheckCircle2} />
          <KpiCard label="Status" value="Healthy" icon={ShieldIcon} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Synchronization Status</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3">System</th>
                <th className="py-3">Status</th>
                <th className="py-3">Last Sync</th>
                <th className="py-3">Records</th>
              </tr>
            </thead>
            <tbody>
              {syncStatuses.map((system) => (
                <tr key={system.system} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 font-semibold text-gray-900">{system.system}</td>
                  <td className="py-4">
                    <Badge label={system.status} className={statusClass(system.status)} />
                  </td>
                  <td className="py-4 text-gray-700">{system.lastSync}</td>
                  <td className="py-4 text-gray-700">{system.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Import History</h2>
        <div className="mt-5 space-y-4 border-l border-gray-200 pl-5">
          {importHistory.map((item) => (
            <div key={`${item.date}-${item.event}`} className="relative">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-[#0A9599]" />
              <p className="text-sm font-semibold text-gray-900">{item.date}</p>
              <p className="mt-1 text-sm text-gray-600">{item.event}</p>
              <Badge label={item.status} className="mt-2 bg-green-100 text-green-700" />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Data Quality Warnings</h2>
        <div className="mt-5 space-y-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div
                key={`${warning.issue}-${warning.record}`}
                className={`rounded-md border p-4 text-sm font-semibold ${
                  warning.severity === "Critical"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
                }`}
              >
                {warning.issue === "Duplicate Customers"
                  ? `Duplicate customer detected | ${warning.record}`
                  : warning.issue === "Missing Renewal Dates"
                    ? `Missing renewal | ${warning.record}`
                    : warning.issue === "Missing Probability"
                      ? `Missing probability | ${warning.record}`
                      : warning.issue === "Missing Owner"
                        ? `Missing owner | ${warning.record}`
                        : `${warning.issue} | ${warning.record}`}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              No CRM data quality issues detected.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Data Health Coach</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CoachMetric label="Data Health Score" value={`${summary.dataHealth}%`} />
          <CoachMetric label="Last Synchronization" value={summary.lastSync} />
          <CoachMetric label="Most Critical Issue" value={mostCriticalIssue} />
          <CoachMetric label="Records Imported" value={formatter.format(summary.recordsImported)} />
          <CoachMetric label="Recommendation" value="Resolve missing ownership before the next Huawei HCS synchronization." />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">
          Data management workflows will be enabled after backend write APIs are connected.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowCards.map((card) => (
            <button
              key={card}
              type="button"
              disabled
              className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-left text-sm text-gray-400"
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

function ShieldIcon({ className }: { className?: string }) {
  return <Settings2 className={className} />;
}
