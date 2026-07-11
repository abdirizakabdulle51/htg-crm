"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Filter,
  History,
  LockKeyhole,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

type ReportCategory =
  | "Users & Access"
  | "Governance"
  | "Configuration"
  | "Data Quality"
  | "Integrations"
  | "Audit"
  | "Security";
type ReportFormat = "CSV" | "PDF";
type ReportStatus = "Available" | "Coming Soon";
type ReportScope = "System" | "Global" | "Country" | "Role-Based";
type CsvValue = string | number;
type CsvPayload = { headers: string[]; rows: CsvValue[][] };

type ReportDefinition = {
  category: ReportCategory;
  description: string;
  downloadKey?: string;
  format: ReportFormat;
  name: string;
  scope: ReportScope;
  status: ReportStatus;
};

type KpiCard = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
};

const users = [
  ["CEO User", "ceo@test.com", "CEO", "All", "Active", "Keycloak", "Today", "Normal"],
  ["Head of Business", "hob@test.com", "Head of Business", "All", "Active", "Keycloak", "Today", "Normal"],
  ["GM Kenya", "gm.kenya@test.com", "Country GM", "Kenya", "Active", "Keycloak", "Yesterday", "Normal"],
  ["GM Somalia", "gm.somalia@test.com", "Country GM", "Somalia", "Active", "Keycloak", "Yesterday", "Normal"],
  ["Account Manager", "am@test.com", "Account Manager", "Kenya", "Active", "Keycloak", "Today", "Normal"],
  ["CRM Admin", "admin@test.com", "Admin", "All", "Active", "Keycloak", "Today", "Normal"],
  ["Inactive User", "inactive@test.com", "Account Manager", "Kenya", "Inactive", "Local CRM", "30 days ago", "Review"],
];

const roleMatrix = [
  ["CEO", "Executive", 1, 42, "Yes", "Read", "Read", "Read", "Read", "Read", "Read", "No Access", "Read", "No Access"],
  ["Head of Business", "Management", 1, 36, "Yes", "Read", "Write", "Read", "Read", "Read", "Write", "No Access", "Read", "No Access"],
  ["Country GM", "Management", 4, 28, "Yes", "Write", "Write", "Read", "Read", "Write", "Read", "No Access", "No Access", "No Access"],
  ["Account Manager", "Operations", 10, 18, "Yes", "Write", "Write", "Write", "Write", "Write", "Read", "No Access", "No Access", "No Access"],
  ["Admin", "Administration", 2, 8, "Admin", "Admin", "Admin", "Admin", "Admin", "Admin", "Admin", "Admin", "Admin", "Admin"],
];

const countries = [
  ["Kenya", "KE", "East Africa", "Kenya Office", "GM Kenya", 6, 5, "Configured", "Configured", "Healthy", "Active"],
  ["Somalia", "SO", "Horn of Africa", "Somalia Office", "GM Somalia", 5, 4, "Configured", "Configured", "Healthy", "Active"],
  ["Ethiopia", "ET", "Horn of Africa", "Ethiopia Office", "GM Ethiopia", 4, 4, "Configured", "Configured", "Warning", "Active"],
  ["Djibouti", "DJ", "Horn of Africa", "Djibouti Office", "GM Djibouti", 3, 3, "Configured", "Partial", "Warning", "Active"],
];

const assignments = [
  ["Kenya Tenant 01", "Kenya", "Telecom", "Account Manager", "GM Kenya", "Assigned", "Healthy"],
  ["Kenya Tenant 02", "Kenya", "Finance", "Account Manager", "GM Kenya", "Assigned", "Healthy"],
  ["Kenya Tenant 04", "Kenya", "Healthcare", "Unassigned", "GM Kenya", "Unassigned", "Warning"],
  ["Somalia Tenant 01", "Somalia", "Telecom", "Somalia AM", "GM Somalia", "Assigned", "Healthy"],
  ["Djibouti Tenant 02", "Djibouti", "Logistics", "Unassigned", "GM Djibouti", "Partial", "Warning"],
];

const targets = [
  ["Company", "HTG Clouds", "All", "Q3", 2026, "$6,900,000", "Configured"],
  ["Country", "Kenya", "Kenya", "Q3", 2026, "$2,400,000", "Configured"],
  ["Country", "Somalia", "Somalia", "Q3", 2026, "$1,500,000", "Configured"],
  ["Country", "Ethiopia", "Ethiopia", "Q3", 2026, "$2,000,000", "Configured"],
  ["Country", "Djibouti", "Djibouti", "Q3", 2026, "$1,000,000", "Configured"],
  ["GM", "GM Kenya", "Kenya", "Q3", 2026, "$2,400,000", "Configured"],
  ["AM", "Account Manager", "Kenya", "Q3", 2026, "$1,200,000", "Configured"],
];

const dataQuality = [
  ["Duplicate Tenants", 0, "Low", "Review duplicate scan before each import", "Healthy"],
  ["Missing Renewal Dates", 0, "Low", "Require renewal date on tenant import", "Healthy"],
  ["Missing Sector", 0, "Low", "Require sector mapping during import", "Healthy"],
  ["Missing Probability", 0, "Low", "Validate opportunity probability values", "Healthy"],
  ["Missing Owner", 1, "Medium", "Assign owner during admin review", "Warning"],
  ["Synchronization Errors", 0, "Low", "Huawei HCS connector pending configuration", "Pending"],
];

const integrations = [
  ["Huawei HCS / ManageOne", "Tenant Source", "Pending Configuration", "Warning", "Critical", "Not connected", "0 tenants", "HCS connector awaiting API information"],
  ["Keycloak", "Authentication", "Connected", "Healthy", "High", "Live", "18 users", "Active identity provider"],
  ["PostgreSQL", "Database", "Connected", "Healthy", "High", "Live", "CRM database", "Primary data store"],
  ["Redis", "Cache", "Connected", "Healthy", "Medium", "Live", "Session/cache layer", "Runtime cache"],
  ["RabbitMQ", "Messaging", "Connected", "Healthy", "Medium", "Live", "Event queue", "Queue service"],
  ["ClickHouse", "Analytics", "Connected", "Healthy", "Medium", "Live", "Analytics store", "Usage analytics store"],
  ["Email", "Communication", "Pending Configuration", "Warning", "Medium", "Not connected", "0 messages", "Delivery channel pending"],
];

const auditEvents = [
  ["Today 09:12", "CRM Admin", "admin@test.com", "Admin", "Viewed", "User Directory", "Users", "All", "Web", "Success", "Info", "Admin reviewed user access"],
  ["Today 09:18", "CRM Admin", "admin@test.com", "Admin", "Exported", "Integration Status", "Integrations", "All", "Web", "Success", "Info", "Admin exported integration readiness"],
  ["Yesterday 15:40", "Head of Business", "hob@test.com", "Head of Business", "Viewed", "Countries", "Admin", "All", "Web", "Success", "Info", "Country configuration reviewed"],
  ["Yesterday 16:05", "CRM Admin", "admin@test.com", "Admin", "Reviewed", "Audit Event Summary", "Audit", "All", "Web", "Success", "Info", "Audit summary reviewed"],
  ["This Week", "System", "system@htg.local", "System", "Checked", "Data Quality Summary", "Data Management", "All", "System", "Success", "Info", "Data quality checks completed"],
];

const reports: ReportDefinition[] = [
  {
    name: "User Directory",
    description: "CRM users, roles, countries, status, source, and last login.",
    category: "Users & Access",
    format: "CSV",
    status: "Available",
    scope: "System",
    downloadKey: "users",
  },
  {
    name: "Role & Permission Matrix",
    description: "Configured roles, permission levels, assigned users, and access governance.",
    category: "Governance",
    format: "CSV",
    status: "Available",
    scope: "System",
    downloadKey: "roles",
  },
  {
    name: "Country Configuration",
    description: "Country offices, regions, GM ownership, targets, and configuration health.",
    category: "Configuration",
    format: "CSV",
    status: "Available",
    scope: "Global",
    downloadKey: "countries",
  },
  {
    name: "Assignment Coverage",
    description: "Tenant ownership, Account Manager allocation, Country GM ownership, and coverage gaps.",
    category: "Configuration",
    format: "CSV",
    status: "Available",
    scope: "Global",
    downloadKey: "assignments",
  },
  {
    name: "Target Configuration",
    description: "Company, country, GM, and Account Manager target setup by quarter and year.",
    category: "Configuration",
    format: "CSV",
    status: "Available",
    scope: "Global",
    downloadKey: "targets",
  },
  {
    name: "Data Quality Summary",
    description: "Duplicate tenants, missing fields, owner gaps, sync errors, and data health.",
    category: "Data Quality",
    format: "CSV",
    status: "Available",
    scope: "System",
    downloadKey: "data-quality",
  },
  {
    name: "Integration Status",
    description: "Huawei HCS / ManageOne readiness, connected services, health, sync status, and warnings.",
    category: "Integrations",
    format: "CSV",
    status: "Available",
    scope: "System",
    downloadKey: "integrations",
  },
  {
    name: "Audit Event Summary",
    description: "User activity, configuration changes, failed events, critical events, and governance status.",
    category: "Audit",
    format: "CSV",
    status: "Available",
    scope: "System",
    downloadKey: "audit",
  },
  {
    name: "System Configuration Report",
    description: "Global CRM settings, thresholds, notifications, security, integration behavior, and warnings.",
    category: "Configuration",
    format: "PDF",
    status: "Coming Soon",
    scope: "System",
  },
  {
    name: "Security & Governance Report",
    description: "Roles, privileged users, failed logins, audit retention, security checks, and governance posture.",
    category: "Security",
    format: "PDF",
    status: "Coming Soon",
    scope: "System",
  },
];

const categories: Array<"All" | ReportCategory> = [
  "All",
  "Users & Access",
  "Governance",
  "Configuration",
  "Data Quality",
  "Integrations",
  "Audit",
  "Security",
];
const formats: Array<"All" | ReportFormat> = ["All", "CSV", "PDF"];
const statuses: Array<"All" | ReportStatus> = ["All", "Available", "Coming Soon"];
const scopes: Array<"All" | ReportScope> = ["All", "System", "Global", "Country", "Role-Based"];

const kpis: KpiCard[] = [
  { label: "Total Reports", value: 10, icon: FileText },
  { label: "Available Downloads", value: 8, icon: Download },
  { label: "Coming Soon", value: 2, icon: Clock },
  { label: "CSV Reports", value: 8, icon: FileText },
  { label: "PDF Reports", value: 2, icon: FileText },
  { label: "Governance Reports", value: 6, icon: ShieldCheck },
  { label: "Last Refresh", value: "Today", icon: RefreshCw },
  { label: "Reporting Health", value: "Healthy", icon: CheckCircle2 },
];

const actions = [
  { label: "Export All Available", icon: Download },
  { label: "Refresh Catalog", icon: RefreshCw },
  { label: "Schedule Report", icon: CalendarClock },
  { label: "Configure Delivery", icon: Send },
  { label: "View Export History", icon: History },
];

const recentActivity = [
  { date: "Today", event: "Exported User Directory", format: "CSV", status: "Success" },
  { date: "Today", event: "Exported Integration Status", format: "CSV", status: "Success" },
  { date: "Yesterday", event: "Exported Audit Event Summary", format: "CSV", status: "Success" },
  { date: "This Week", event: "System Configuration PDF requested", format: "PDF", status: "Coming Soon" },
];

const governance = [
  { label: "CSV Export", status: "Enabled" },
  { label: "PDF Export", status: "Coming Soon" },
  { label: "Scheduled Reports", status: "Coming Soon" },
  { label: "Email Delivery", status: "Not Configured" },
  { label: "Export Audit Logging", status: "Planned" },
  { label: "Sensitive Data Protection", status: "Enabled" },
  { label: "Retention Policy", status: "90 Days" },
  { label: "Access Scope", status: "Admin Only" },
];

const warnings = [
  { message: "PDF reporting is not yet available", severity: "Information" },
  { message: "Scheduled reports are not configured", severity: "Warning" },
  { message: "Email report delivery is not configured", severity: "Warning" },
  { message: "Export audit logging is planned", severity: "Information" },
  { message: "Huawei HCS integration data remains configuration-only until connected", severity: "Information" },
];

const versionTwoWorkflows = [
  "Report Builder",
  "PDF Template Designer",
  "Scheduled Report Delivery",
  "Email Distribution Lists",
  "Export History",
  "Report Access Policies",
  "Saved Report Filters",
  "Board Pack Generator",
];

function csvEscape(value: CsvValue) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv({ headers, rows }: CsvPayload) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function filenameFromReport(reportName: string) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = reportName.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `admin-${slug}-${date}.csv`;
}

function getCsvPayload(key: string): CsvPayload {
  switch (key) {
    case "users":
      return {
        headers: ["Name", "Email", "Role", "Country", "Status", "Source", "Last Login", "Last Login Risk"],
        rows: users,
      };
    case "roles":
      return {
        headers: [
          "Role",
          "Permission Level",
          "Users Assigned",
          "Permission Count",
          "Dashboard",
          "Tenants",
          "Pipeline",
          "Tasks",
          "Activities",
          "Renewals",
          "Reports",
          "Administration",
          "Audit",
          "Integrations",
        ],
        rows: roleMatrix,
      };
    case "countries":
      return {
        headers: [
          "Country",
          "Code",
          "Region",
          "Office",
          "Country GM",
          "Users",
          "Tenants",
          "Targets Configured",
          "Assignment Status",
          "Data Health",
          "Status",
        ],
        rows: countries,
      };
    case "assignments":
      return {
        headers: ["Tenant", "Country", "Sector", "Account Manager", "Country GM", "Assignment Status", "Health"],
        rows: assignments,
      };
    case "targets":
      return {
        headers: ["Level", "Owner", "Country", "Quarter", "Year", "Target", "Status"],
        rows: targets,
      };
    case "data-quality":
      return {
        headers: ["Issue", "Affected Records", "Severity", "Recommended Action", "Status"],
        rows: dataQuality,
      };
    case "integrations":
      return {
        headers: ["Integration", "Type", "Status", "Health", "Priority", "Last Sync", "Records", "Notes"],
        rows: integrations,
      };
    case "audit":
      return {
        headers: [
          "Timestamp",
          "Actor",
          "Actor Email",
          "Role",
          "Action",
          "Resource",
          "Module",
          "Country",
          "Source",
          "Result",
          "Severity",
          "Summary",
        ],
        rows: auditEvents,
      };
    default:
      return { headers: [], rows: [] };
  }
}

function downloadCsv(report: ReportDefinition) {
  if (!report.downloadKey) return;
  const csv = toCsv(getCsvPayload(report.downloadKey));
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFromReport(report.name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function badgeClass(value: string) {
  if (["Available", "Enabled", "Success", "Healthy"].includes(value)) return "bg-emerald-100 text-emerald-700";
  if (["Warning", "Not Configured"].includes(value)) return "bg-amber-100 text-amber-700";
  if (["Coming Soon", "Planned", "Information", "90 Days", "Admin Only"].includes(value)) {
    return "bg-gray-100 text-gray-600";
  }
  return "bg-[#0A9599]/10 text-[#0A9599]";
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="text-xs font-semibold uppercase text-gray-500">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm normal-case text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
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

export default function AdminReportsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("All");
  const [formatFilter, setFormatFilter] = useState<(typeof formats)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("All");
  const [scopeFilter, setScopeFilter] = useState<(typeof scopes)[number]>("All");

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const searchText = [report.name, report.description, report.category, report.format].join(" ").toLowerCase();
      return (
        (term.length === 0 || searchText.includes(term)) &&
        (categoryFilter === "All" || report.category === categoryFilter) &&
        (formatFilter === "All" || report.format === formatFilter) &&
        (statusFilter === "All" || report.status === statusFilter) &&
        (scopeFilter === "All" || report.scope === scopeFilter)
      );
    });
  }, [categoryFilter, formatFilter, scopeFilter, search, statusFilter]);

  const categorySummary = useMemo(() => {
    return categories
      .filter((category): category is ReportCategory => category !== "All")
      .map((category) => {
        const categoryReports = reports.filter((report) => report.category === category);
        const available = categoryReports.filter((report) => report.status === "Available").length;
        const comingSoon = categoryReports.length - available;
        const formatsInCategory = Array.from(new Set(categoryReports.map((report) => report.format))).join(" + ");

        return {
          available,
          category,
          comingSoon,
          count: categoryReports.length,
          formatMix: formatsInCategory || "None",
        };
      });
  }, []);

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate administrative reports, configuration exports, audit summaries, and system governance reports.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-gray-500">{kpi.label}</p>
                <Icon className="h-4 w-4 shrink-0 text-[#0A9599]" />
              </div>
              <p className="mt-5 text-2xl font-semibold text-gray-900">{kpi.value}</p>
            </div>
          );
        })}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Report Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Bulk exports, scheduled reports, and delivery workflows will be enabled after backend reporting APIs are
              connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-400"
                  title="Coming soon"
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <label className="relative">
            <span className="sr-only">Search reports</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report name, description, category, or format"
              className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
            />
          </label>
          <FilterSelect
            label="Category"
            value={categoryFilter}
            options={categories}
            onChange={(value) => setCategoryFilter(value as (typeof categories)[number])}
          />
          <FilterSelect
            label="Format"
            value={formatFilter}
            options={formats}
            onChange={(value) => setFormatFilter(value as (typeof formats)[number])}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            options={statuses}
            onChange={(value) => setStatusFilter(value as (typeof statuses)[number])}
          />
          <FilterSelect
            label="Scope"
            value={scopeFilter}
            options={scopes}
            onChange={(value) => setScopeFilter(value as (typeof scopes)[number])}
          />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Report Library</h2>
            <p className="mt-1 text-sm text-gray-500">Safe administrative CSV exports and future PDF reports.</p>
          </div>
          <Filter className="h-5 w-5 text-[#0A9599]" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => (
            <article key={report.name} className="rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{report.name}</h3>
                  <p className="mt-2 text-sm text-gray-500">{report.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(report.status)}`}>
                  {report.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-500">
                <span className="rounded-full bg-gray-100 px-2.5 py-1">{report.category}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1">{report.format}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-1">{report.scope}</span>
              </div>
              <button
                type="button"
                disabled={report.status !== "Available"}
                onClick={() => downloadCsv(report)}
                title={report.status === "Available" ? `Export ${report.name}` : "Coming soon"}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  report.status === "Available"
                    ? "bg-[#0A9599] text-white hover:bg-[#08777A] focus:outline-none focus:ring-2 focus:ring-[#0A9599]/30"
                    : "cursor-not-allowed bg-gray-100 text-gray-400"
                }`}
              >
                <Download className="h-4 w-4" />
                Export {report.format}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Available Reports</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                <th className="py-3 pr-4">Report</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Format</th>
                <th className="py-3 pr-4">Scope</th>
                <th className="py-3 pr-4">Last Updated</th>
                <th className="py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.name} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{report.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{report.category}</td>
                  <td className="py-3 pr-4 text-gray-600">{report.format}</td>
                  <td className="py-3 pr-4 text-gray-600">{report.scope}</td>
                  <td className="py-3 pr-4 text-gray-600">Today</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Report Category Summary</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {categorySummary.map((summary) => (
            <div key={summary.category} className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">{summary.category}</h3>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase text-gray-500">Report Count</dt>
                  <dd className="font-semibold text-gray-900">{summary.count}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Available</dt>
                  <dd className="font-semibold text-gray-900">{summary.available}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Coming Soon</dt>
                  <dd className="font-semibold text-gray-900">{summary.comingSoon}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-gray-500">Format Mix</dt>
                  <dd className="font-semibold text-gray-900">{summary.formatMix}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Recent Export Activity</h2>
        <p className="mt-1 text-sm text-gray-500">Version 1 static preview while backend export history is pending.</p>
        <div className="mt-5 space-y-3">
          {recentActivity.map((activity) => (
            <div key={`${activity.date}-${activity.event}`} className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
              <History className="h-4 w-4 text-[#0A9599]" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{activity.event}</p>
                <p className="text-sm text-gray-500">
                  {activity.date} - {activity.format}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(activity.status)}`}>
                {activity.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Reporting Governance</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {governance.map((item) => (
            <div key={item.label} className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">{item.label}</p>
              <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(item.status)}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Report Warnings</h2>
        <div className="mt-5 space-y-3">
          {warnings.length === 0 ? (
            <p className="text-sm text-gray-500">All administrative reporting capabilities are configured.</p>
          ) : (
            warnings.map((warning) => (
              <div
                key={warning.message}
                className={`flex items-center gap-3 rounded-lg border p-4 text-sm font-semibold ${
                  warning.severity === "Warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
                <span>{warning.message}</span>
                <span className="ml-auto text-xs">{warning.severity}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Report Admin Coach</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ["Reporting Health", "Healthy"],
            ["Available Downloads", "8"],
            ["Most Used Report", "User Directory"],
            ["Coming Soon", "2"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
              <p className="mt-2 font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-lg border border-[#0A9599]/20 bg-white p-4 text-sm font-semibold text-gray-700">
          Export the Integration Status and Audit Event Summary before the next system governance review.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflows</h2>
        <p className="mt-1 text-sm text-gray-500">
          Advanced reporting workflows will be enabled after backend reporting, scheduling, and secure delivery APIs are
          connected.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {versionTwoWorkflows.map((workflow) => (
            <div key={workflow} className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-400">
              <LockKeyhole className="h-4 w-4" />
              <p className="mt-3 font-semibold">{workflow}</p>
              <p className="mt-1 text-sm">Coming soon</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
