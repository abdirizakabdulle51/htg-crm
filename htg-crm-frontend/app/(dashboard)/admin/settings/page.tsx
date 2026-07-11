"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Download,
  FileDown,
  FileUp,
  Filter,
  History,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  Save,
  Search,
  Settings2,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

type SettingGroup =
  | "Organization"
  | "Tenants"
  | "Health & Risk"
  | "Opportunities"
  | "Notifications"
  | "Security"
  | "Integrations"
  | "Audit";
type SettingScope = "Global" | "Role-Based" | "Country-Specific";
type SettingStatus = "Configured" | "Pending" | "Disabled";
type GroupHealth = "Healthy" | "Warning" | "Incomplete";
type WarningSeverity = "Critical" | "Warning" | "Information";

type SettingRecord = {
  description: string;
  group: SettingGroup;
  name: string;
  scope: SettingScope;
  status: SettingStatus;
  value: string;
};

type SettingRow = {
  label: string;
  scope: SettingScope;
  status: SettingStatus;
  value: string | boolean;
};

type NotificationSetting = {
  description: string;
  enabled: boolean;
  label: string;
};

type ConfigurationStatus = {
  configured: number;
  group: SettingGroup;
  health: GroupHealth;
  pending: number;
  scope: SettingScope;
  settings: number;
};

const organizationSettings: SettingRow[] = [
  { label: "Company Name", value: "HTG Clouds", scope: "Global", status: "Configured" },
  { label: "Default Currency", value: "USD", scope: "Global", status: "Configured" },
  { label: "Fiscal Year Start", value: "January", scope: "Global", status: "Configured" },
  { label: "Current Default Quarter", value: "Q3 2026", scope: "Global", status: "Configured" },
  { label: "Timezone", value: "Africa/Nairobi", scope: "Global", status: "Configured" },
  { label: "Date Format", value: "MMM d, yyyy", scope: "Global", status: "Configured" },
  { label: "Language", value: "English", scope: "Global", status: "Configured" },
];

const tenantSettings: SettingRow[] = [
  { label: "Entity Label", value: "Tenant", scope: "Global", status: "Configured" },
  { label: "Default Tenant Status", value: "ACTIVE", scope: "Global", status: "Configured" },
  { label: "Renewal Warning Window", value: "90 days", scope: "Global", status: "Configured" },
  { label: "Urgent Renewal Window", value: "30 days", scope: "Global", status: "Configured" },
  { label: "Country Required", value: true, scope: "Global", status: "Configured" },
  { label: "Sector Required", value: true, scope: "Global", status: "Configured" },
  { label: "Account Manager Required", value: true, scope: "Role-Based", status: "Configured" },
];

const healthRiskSettings: SettingRow[] = [
  { label: "Healthy Score", value: "80-100", scope: "Global", status: "Configured" },
  { label: "Warning", value: "60-79", scope: "Global", status: "Configured" },
  { label: "Critical", value: "Below 60", scope: "Global", status: "Configured" },
  { label: "Low Risk", value: "0-19", scope: "Global", status: "Configured" },
  { label: "Medium", value: "20-50", scope: "Global", status: "Configured" },
  { label: "High", value: "Above 50", scope: "Global", status: "Configured" },
];

const opportunitySettings: SettingRow[] = [
  { label: "Default Probability", value: "25%", scope: "Global", status: "Configured" },
  { label: "Close Date Required", value: true, scope: "Global", status: "Configured" },
  { label: "Owner Required", value: true, scope: "Role-Based", status: "Configured" },
  { label: "Stale Opportunity Window", value: "30 days", scope: "Global", status: "Configured" },
];

const pipelineStages = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const notificationSettings: NotificationSetting[] = [
  { label: "Renewal Alerts", enabled: true, description: "Warn owners when tenant renewals approach." },
  { label: "Risk Alerts", enabled: true, description: "Notify leaders when risk thresholds are crossed." },
  { label: "Approval Alerts", enabled: true, description: "Notify approvers about pending commercial decisions." },
  { label: "Assignment Alerts", enabled: true, description: "Notify users when ownership changes." },
  { label: "Integration Failure Alerts", enabled: true, description: "Warn admins when integrations fail." },
  { label: "Daily Digest", enabled: false, description: "Daily workspace summary for operational users." },
  { label: "Weekly Executive Summary", enabled: true, description: "Weekly executive operating summary." },
];

const securitySettings: SettingRow[] = [
  { label: "Identity Provider", value: "Keycloak", scope: "Global", status: "Configured" },
  { label: "Session Timeout", value: "8 hours", scope: "Global", status: "Configured" },
  { label: "Failed Login Threshold", value: "5 attempts", scope: "Global", status: "Configured" },
  { label: "Audit Retention", value: "90 days", scope: "Global", status: "Configured" },
  { label: "Admin MFA Requirement", value: "Not Yet Enabled", scope: "Role-Based", status: "Pending" },
  { label: "Password Management", value: "Managed by identity provider", scope: "Global", status: "Configured" },
];

const integrationSettings: SettingRow[] = [
  { label: "Huawei HCS Sync Mode", value: "Not Configured", scope: "Global", status: "Pending" },
  { label: "Scheduled Sync", value: "Disabled", scope: "Global", status: "Disabled" },
  { label: "Conflict Resolution Mode", value: "Admin Review", scope: "Global", status: "Configured" },
  { label: "Failed Record Handling", value: "Continue valid records", scope: "Global", status: "Configured" },
  { label: "Source-of-Truth Strategy", value: "Field-level ownership", scope: "Global", status: "Configured" },
];

const auditSettings: SettingRecord[] = [
  {
    group: "Audit",
    name: "Audit Retention",
    value: "90 days",
    description: "Retention window for administrative and system audit events.",
    scope: "Global",
    status: "Configured",
  },
  {
    group: "Audit",
    name: "Settings Change History",
    value: "Read-only",
    description: "Administrative configuration changes will be tracked after write APIs are enabled.",
    scope: "Global",
    status: "Pending",
  },
];

const versionTwoWorkflows = [
  "Global Settings Editor",
  "Role-Based Overrides",
  "Country-Specific Settings",
  "Notification Channel Builder",
  "Threshold Simulator",
  "Configuration Import Wizard",
  "Settings Version History",
  "Restore Previous Configuration",
];

const configStatusRows: ConfigurationStatus[] = [
  { group: "Organization", settings: 7, configured: 7, pending: 0, scope: "Global", health: "Healthy" },
  { group: "Tenants", settings: 7, configured: 7, pending: 0, scope: "Role-Based", health: "Healthy" },
  { group: "Health & Risk", settings: 6, configured: 6, pending: 0, scope: "Global", health: "Healthy" },
  { group: "Opportunities", settings: 5, configured: 5, pending: 0, scope: "Role-Based", health: "Healthy" },
  { group: "Notifications", settings: 7, configured: 6, pending: 1, scope: "Role-Based", health: "Warning" },
  { group: "Security", settings: 6, configured: 5, pending: 1, scope: "Global", health: "Warning" },
  { group: "Integrations", settings: 5, configured: 3, pending: 2, scope: "Global", health: "Warning" },
  { group: "Audit", settings: 2, configured: 1, pending: 1, scope: "Global", health: "Warning" },
];

const settingsWarnings: { message: string; severity: WarningSeverity }[] = [
  { message: "Huawei HCS synchronization is not configured", severity: "Critical" },
  { message: "Admin MFA is not enabled", severity: "Warning" },
  { message: "Email notification delivery is not configured", severity: "Warning" },
  { message: "Scheduled synchronization is disabled", severity: "Warning" },
  { message: "Daily digest is disabled", severity: "Information" },
];

const groupOptions = [
  "All",
  "Organization",
  "Tenants",
  "Health & Risk",
  "Opportunities",
  "Notifications",
  "Security",
  "Integrations",
  "Audit",
];
const statusOptions = ["All", "Configured", "Pending", "Disabled"];
const scopeOptions = ["All", "Global", "Role-Based", "Country-Specific"];

function formatValue(value: string | boolean) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
}

function statusClass(status: SettingStatus | GroupHealth | string) {
  if (status === "Configured" || status === "Healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "Pending" || status === "Warning") return "bg-amber-100 text-amber-700";
  if (status === "Disabled") return "bg-gray-100 text-gray-600";
  if (status === "Incomplete") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function severityClass(severity: WarningSeverity) {
  if (severity === "Critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "Warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function tableRecords(rows: SettingRow[], group: SettingGroup, description: string): SettingRecord[] {
  return rows.map((row) => ({
    group,
    name: row.label,
    value: formatValue(row.value),
    description,
    scope: row.scope,
    status: row.status,
  }));
}

function Badge({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-5 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
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
      disabled
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400"
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
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 focus:border-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599]/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
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

function SettingsTable({ rows }: { rows: SettingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="py-3 pr-4">Label</th>
            <th className="py-3 pr-4">Current Value</th>
            <th className="py-3 pr-4">Scope</th>
            <th className="py-3 pr-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-3 pr-4 font-semibold text-gray-900">{row.label}</td>
              <td className="py-3 pr-4 text-gray-700">{formatValue(row.value)}</td>
              <td className="py-3 pr-4 text-gray-600">{row.scope}</td>
              <td className="py-3 pr-4">
                <Badge className={statusClass(row.status)}>{row.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("All");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const allSettings = useMemo(() => {
    const notificationRows: SettingRecord[] = notificationSettings.map((setting) => ({
      group: "Notifications",
      name: setting.label,
      value: setting.enabled ? "Enabled" : "Disabled",
      description: setting.description,
      scope: "Role-Based",
      status: setting.enabled ? "Configured" : "Disabled",
    }));

    return [
      ...tableRecords(organizationSettings, "Organization", "Global organization behavior and display defaults."),
      ...tableRecords(tenantSettings, "Tenants", "Tenant data requirements, renewal timing, and ownership defaults."),
      ...tableRecords(healthRiskSettings, "Health & Risk", "Dashboard health and risk classification thresholds."),
      ...tableRecords(opportunitySettings, "Opportunities", "Pipeline data rules and opportunity governance."),
      {
        group: "Opportunities",
        name: "Allowed Pipeline Stages",
        value: pipelineStages.join(", "),
        description: "Pipeline stages available across CRM workspaces.",
        scope: "Role-Based",
        status: "Configured",
      },
      ...notificationRows,
      ...tableRecords(securitySettings, "Security", "Authentication, session, and administrative security behavior."),
      ...tableRecords(integrationSettings, "Integrations", "External platform synchronization behavior."),
      ...auditSettings,
    ];
  }, []);

  const filteredSettings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allSettings.filter((setting) => {
      const matchesQuery =
        !normalizedQuery ||
        [setting.name, setting.value, setting.group, setting.description]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesGroup = groupFilter === "All" || setting.group === groupFilter;
      const matchesStatus = statusFilter === "All" || setting.status === statusFilter;
      const matchesScope = scopeFilter === "All" || setting.scope === scopeFilter;
      return matchesQuery && matchesGroup && matchesStatus && matchesScope;
    });
  }, [allSettings, groupFilter, query, scopeFilter, statusFilter]);

  const configuredSettings = allSettings.filter((setting) => setting.status === "Configured").length;
  const pendingSettings = allSettings.filter((setting) => setting.status === "Pending").length;
  const requiredFields = tenantSettings.filter((setting) => setting.label.endsWith("Required") && setting.value === true).length;
  const activeNotifications = notificationSettings.filter((setting) => setting.enabled).length;
  const pendingGroups = configStatusRows.filter((row) => row.health !== "Healthy").length;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">System Settings</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configure CRM behavior, defaults, notifications, thresholds, security, and global system preferences.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Settings2} label="Configuration Groups" value={configStatusRows.length} />
        <KpiCard icon={CheckCircle2} label="Configured Settings" value={configuredSettings} />
        <KpiCard icon={AlertTriangle} label="Pending Settings" value={pendingSettings} />
        <KpiCard icon={SlidersHorizontal} label="Required Fields" value={requiredFields} />
        <KpiCard icon={Bell} label="Active Notifications" value={activeNotifications} />
        <KpiCard icon={KeyRound} label="Security Provider" value="Keycloak" />
        <KpiCard icon={History} label="Audit Retention" value="90 days" />
        <KpiCard icon={AlertTriangle} label="Settings Health" value="Warning" />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Settings Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Settings write actions will be enabled after secure backend configuration APIs are connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledButton icon={Settings2} label="Edit Settings" />
            <DisabledButton icon={Save} label="Save Changes" />
            <DisabledButton icon={RotateCcw} label="Reset Defaults" />
            <DisabledButton icon={FileUp} label="Import Configuration" />
            <DisabledButton icon={Download} label="Export Configuration" />
            <DisabledButton icon={FileDown} label="View Change History" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            <span className="sr-only">Search settings</span>
            <input
              className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-700 focus:border-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search setting name, value, group, or description"
              value={query}
            />
          </label>
          <FilterSelect label="Config Group" onChange={setGroupFilter} options={groupOptions} value={groupFilter} />
          <FilterSelect label="Status" onChange={setStatusFilter} options={statusOptions} value={statusFilter} />
          <FilterSelect label="Scope" onChange={setScopeFilter} options={scopeOptions} value={scopeFilter} />
        </div>
        <div className="mt-5 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
            <Filter className="h-4 w-4 text-[#0A9599]" />
            <p className="text-sm font-semibold text-gray-800">Filtered Settings ({filteredSettings.length})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Setting</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSettings.map((setting) => (
                  <tr key={`${setting.group}-${setting.name}`}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{setting.name}</p>
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{setting.group}</td>
                    <td className="px-4 py-3 text-gray-700">{setting.value}</td>
                    <td className="px-4 py-3 text-gray-600">{setting.scope}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusClass(setting.status)}>{setting.status}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredSettings.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                      No settings match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Organization Settings</h2>
          <p className="mt-1 text-sm text-gray-500">Global identity and operating defaults.</p>
          <div className="mt-5">
            <SettingsTable rows={organizationSettings} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Tenant & Renewal Settings</h2>
          <p className="mt-1 text-sm text-gray-500">Tenant terminology, required fields, and renewal timing.</p>
          <div className="mt-5">
            <SettingsTable rows={tenantSettings} />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Health & Risk Thresholds</h2>
        <p className="mt-1 text-sm text-gray-500">
          These thresholds control health and risk classifications across CRM dashboards.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">Healthy Score</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">80-100</p>
            <p className="mt-1 text-xs text-emerald-700">Low Risk 0-19</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">Warning</p>
            <p className="mt-2 text-2xl font-bold text-amber-900">60-79</p>
            <p className="mt-1 text-xs text-amber-700">Medium Risk 20-50</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Critical</p>
            <p className="mt-2 text-2xl font-bold text-red-900">Below 60</p>
            <p className="mt-1 text-xs text-red-700">High Risk Above 50</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Opportunity Settings</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {opportunitySettings.map((setting) => (
            <div key={setting.label} className="rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{setting.label}</p>
              <p className="mt-3 text-lg font-bold text-gray-900">{formatValue(setting.value)}</p>
              <p className="mt-1 text-xs text-gray-500">{setting.scope}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800">Allowed Pipeline Stages</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pipelineStages.map((stage) => (
              <Badge key={stage} className="bg-[#0A9599]/10 text-[#0A9599]">
                {stage}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Notification Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Notification delivery channels will be configured when email and messaging integrations are connected.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {notificationSettings.map((setting) => {
            const ToggleIcon = setting.enabled ? ToggleRight : ToggleLeft;
            return (
              <div key={setting.label} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">{setting.label}</p>
                    <p className="mt-1 text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <ToggleIcon className={`h-6 w-6 ${setting.enabled ? "text-emerald-600" : "text-gray-400"}`} />
                </div>
                <Badge className={`mt-4 ${setting.enabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                  {setting.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Security & Session Settings</h2>
          <div className="mt-5 space-y-3">
            {securitySettings.map((setting) => (
              <div key={setting.label} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{setting.label}</p>
                  <p className="text-sm text-gray-500">{formatValue(setting.value)}</p>
                </div>
                <Badge className={setting.label === "Admin MFA Requirement" ? "bg-amber-100 text-amber-700" : statusClass(setting.status)}>
                  {setting.label === "Admin MFA Requirement" ? "Not Yet Enabled" : setting.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Integration Behavior Settings</h2>
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            Huawei HCS / ManageOne behavior will become configurable after the connector is implemented.
          </p>
          <div className="mt-5 space-y-3">
            {integrationSettings.map((setting) => (
              <div key={setting.label} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{setting.label}</p>
                  <p className="text-sm text-gray-500">{formatValue(setting.value)}</p>
                </div>
                <Badge className={statusClass(setting.status)}>{setting.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Configuration Status</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Configuration Group</th>
                <th className="py-3 pr-4">Settings</th>
                <th className="py-3 pr-4">Configured</th>
                <th className="py-3 pr-4">Pending</th>
                <th className="py-3 pr-4">Scope</th>
                <th className="py-3 pr-4">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {configStatusRows.map((row) => (
                <tr key={row.group}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{row.group}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.settings}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.configured}</td>
                  <td className="py-3 pr-4 text-gray-700">{row.pending}</td>
                  <td className="py-3 pr-4 text-gray-600">{row.scope}</td>
                  <td className="py-3 pr-4">
                    <Badge className={statusClass(row.health)}>{row.health}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Settings Warnings</h2>
        <div className="mt-5 space-y-3">
          {settingsWarnings.map((warning) => (
            <div key={warning.message} className={`rounded-lg border px-4 py-3 text-sm font-semibold ${severityClass(warning.severity)}`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{warning.message}</span>
                <span className="ml-auto text-xs uppercase tracking-wide">{warning.severity}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Settings Admin Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Settings Health</p>
            <p className="mt-3 text-lg font-bold text-gray-900">Warning</p>
          </div>
          <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Configured Groups</p>
            <p className="mt-3 text-lg font-bold text-gray-900">{configStatusRows.length - pendingGroups}</p>
          </div>
          <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending Groups</p>
            <p className="mt-3 text-lg font-bold text-gray-900">{pendingGroups}</p>
          </div>
          <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Most Urgent Setting</p>
            <p className="mt-3 text-sm font-bold text-gray-900">Huawei HCS synchronization</p>
          </div>
          <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommendation</p>
            <p className="mt-3 text-sm font-bold text-gray-900">
              Configure Huawei HCS synchronization and enable Admin MFA before activating production write workflows.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflow Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">
          Settings workflows will be enabled after secure backend configuration APIs and audit logging are connected.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
