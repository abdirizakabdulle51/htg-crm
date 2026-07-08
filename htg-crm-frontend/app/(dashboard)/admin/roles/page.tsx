"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  Download,
  Edit3,
  Eye,
  GitBranch,
  KeyRound,
  Layers3,
  LockKeyhole,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

type RoleStatus = "Active" | "Inactive";
type PermissionLevel = "Executive" | "Management" | "Operations" | "Administration";
type MatrixValue = "✓" | "Read" | "Write" | "Admin" | "No Access";

type RoleRecord = {
  role: string;
  users: number;
  permissions: number;
  description: string;
  status: RoleStatus;
  level: PermissionLevel;
};

const roles: RoleRecord[] = [
  {
    role: "CEO",
    users: 1,
    permissions: 42,
    description: "Executive visibility across the company.",
    status: "Active",
    level: "Executive",
  },
  {
    role: "Head of Business",
    users: 1,
    permissions: 36,
    description: "Commercial leadership across countries, sectors, and strategic accounts.",
    status: "Active",
    level: "Management",
  },
  {
    role: "Country GM",
    users: 4,
    permissions: 28,
    description: "Country execution, team oversight, customer health, and pipeline control.",
    status: "Active",
    level: "Management",
  },
  {
    role: "Account Manager",
    users: 10,
    permissions: 18,
    description: "Customer relationship management, pipeline execution, tasks, and renewals.",
    status: "Active",
    level: "Operations",
  },
  {
    role: "Admin",
    users: 2,
    permissions: 8,
    description: "System administration, configuration governance, audit, and integrations.",
    status: "Active",
    level: "Administration",
  },
];

const statusOptions = ["All", "Active", "Inactive"] as const;
const levelOptions = ["All", "Executive", "Management", "Operations", "Administration"] as const;

const roleActions = [
  { label: "Create Role", icon: ShieldCheck },
  { label: "Clone Role", icon: Copy },
  { label: "Assign Role", icon: UserPlus },
  { label: "Edit Permissions", icon: KeyRound },
  { label: "Export Matrix", icon: Download },
];

const permissionColumns = [
  "Dashboard",
  "Customers",
  "Pipeline",
  "Tasks",
  "Activities",
  "Renewals",
  "Reports",
  "Administration",
  "Audit",
  "Integrations",
] as const;

const permissionMatrix: Record<string, Record<(typeof permissionColumns)[number], MatrixValue>> = {
  CEO: {
    Dashboard: "✓",
    Customers: "Read",
    Pipeline: "Read",
    Tasks: "Read",
    Activities: "Read",
    Renewals: "Read",
    Reports: "Read",
    Administration: "No Access",
    Audit: "Read",
    Integrations: "No Access",
  },
  "Head of Business": {
    Dashboard: "✓",
    Customers: "Read",
    Pipeline: "Write",
    Tasks: "Read",
    Activities: "Read",
    Renewals: "Read",
    Reports: "Write",
    Administration: "No Access",
    Audit: "Read",
    Integrations: "No Access",
  },
  "Country GM": {
    Dashboard: "✓",
    Customers: "Write",
    Pipeline: "Write",
    Tasks: "Read",
    Activities: "Read",
    Renewals: "Write",
    Reports: "Read",
    Administration: "No Access",
    Audit: "No Access",
    Integrations: "No Access",
  },
  "Account Manager": {
    Dashboard: "✓",
    Customers: "Write",
    Pipeline: "Write",
    Tasks: "Write",
    Activities: "Write",
    Renewals: "Write",
    Reports: "Read",
    Administration: "No Access",
    Audit: "No Access",
    Integrations: "No Access",
  },
  Admin: {
    Dashboard: "Admin",
    Customers: "Admin",
    Pipeline: "Admin",
    Tasks: "Admin",
    Activities: "Admin",
    Renewals: "Admin",
    Reports: "Admin",
    Administration: "Admin",
    Audit: "Admin",
    Integrations: "Admin",
  },
};

const governanceCards = [
  { label: "No conflicting role assignments", status: "Healthy", tone: "green" },
  { label: "No orphan permissions", status: "Healthy", tone: "green" },
  { label: "5 standard roles configured", status: "Healthy", tone: "green" },
  { label: "No custom roles detected", status: "Watch", tone: "amber" },
];

const securityChecks = [
  { label: "Admin accounts", value: "2" },
  { label: "Inactive privileged users", value: "0" },
  { label: "Duplicate roles", value: "0" },
  { label: "Permission conflicts", value: "0" },
  { label: "Overall Security", value: "Healthy" },
];

const futureFeatures = [
  "Role Editor",
  "Permission Editor",
  "Drag-and-drop permissions",
  "Role cloning",
  "Bulk assignment",
  "Inheritance rules",
  "Approval workflow",
];

function statusClass(status: RoleStatus) {
  if (status === "Active") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-600";
}

function levelClass(level: PermissionLevel) {
  if (level === "Executive") return "bg-slate-900 text-white";
  if (level === "Management") return "bg-[#0A9599]/10 text-[#0A9599]";
  if (level === "Operations") return "bg-purple-100 text-purple-700";
  return "bg-red-100 text-red-700";
}

function matrixClass(value: MatrixValue) {
  if (value === "Admin") return "bg-red-100 text-red-700";
  if (value === "Write") return "bg-[#0A9599]/10 text-[#0A9599]";
  if (value === "Read") return "bg-blue-100 text-blue-700";
  if (value === "✓") return "bg-emerald-100 text-emerald-700";
  return "bg-gray-100 text-gray-500";
}

function governanceClass(tone: string) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

export default function AdminRolesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [levelFilter, setLevelFilter] = useState<(typeof levelOptions)[number]>("All");

  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase();

    return roles.filter((role) => {
      const matchesSearch =
        term.length === 0 ||
        role.role.toLowerCase().includes(term) ||
        role.description.toLowerCase().includes(term) ||
        role.status.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "All" || role.status === statusFilter;
      const matchesLevel = levelFilter === "All" || role.level === levelFilter;

      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [levelFilter, search, statusFilter]);

  const totalUsers = roles.reduce((sum, role) => sum + role.users, 0);
  const activePermissions = roles.reduce((sum, role) => sum + role.permissions, 0);
  const largestRole = [...roles].sort((a, b) => b.users - a.users)[0];

  const kpis = [
    { label: "Configured Roles", value: "5", icon: ShieldCheck },
    { label: "Permission Groups", value: "8", icon: Layers3 },
    { label: "Active Permissions", value: String(activePermissions), icon: KeyRound },
    { label: "Users Assigned", value: String(totalUsers), icon: Users },
    { label: "Custom Roles", value: "0", icon: GitBranch },
    { label: "Permission Conflicts", value: "0", icon: LockKeyhole },
    { label: "Security Status", value: "Healthy", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-[#0A9599]">Access governance</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Roles &amp; Permissions</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage CRM roles, access levels, workspace permissions, and governance.
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
        <h2 className="text-xl font-semibold text-gray-800">Role Actions</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {roleActions.map(({ label, icon: Icon }) => (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
              disabled
              key={label}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-gray-500">Role editing will be enabled after backend workflow integration.</p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search &amp; Filters</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by role, description, or status"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect
            label="Role Status"
            onChange={(value) => setStatusFilter(value as (typeof statusOptions)[number])}
            options={statusOptions}
            value={statusFilter}
          />
          <FilterSelect
            label="Permission Level"
            onChange={(value) => setLevelFilter(value as (typeof levelOptions)[number])}
            options={levelOptions}
            value={levelFilter}
          />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Role Directory</h2>
            <p className="mt-1 text-sm text-gray-500">{filteredRoles.length} roles match the current filters.</p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 text-right font-medium">Users</th>
                <th className="py-3 pr-4 text-right font-medium">Permissions</th>
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((role) => (
                <tr className="border-b last:border-0" key={role.role}>
                  <td className="py-3 pr-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-semibold text-gray-900">{role.role}</span>
                      <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${levelClass(role.level)}`}>
                        {role.level}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900">{role.users}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900">{role.permissions}</td>
                  <td className="py-3 pr-4 text-gray-600">{role.description}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(role.status)}`}>
                      {role.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "View", icon: Eye },
                        { label: "Edit", icon: Edit3 },
                        { label: "Clone", icon: Copy },
                        { label: "Delete", icon: Trash2 },
                      ].map(({ label, icon: Icon }) => (
                        <button
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
                          disabled
                          key={label}
                          type="button"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRoles.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-gray-500" colSpan={6}>
                    No roles match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Permission Matrix</h2>
        <p className="mt-1 text-sm text-gray-500">Read-only Version 1 access map across CRM workspaces.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Role</th>
                {permissionColumns.map((column) => (
                  <th className="py-3 pr-4 text-center font-medium" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr className="border-b last:border-0" key={role.role}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{role.role}</td>
                  {permissionColumns.map((column) => {
                    const value = permissionMatrix[role.role][column];
                    return (
                      <td className="py-3 pr-4 text-center" key={`${role.role}-${column}`}>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${matrixClass(value)}`}>
                          {value}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Access Governance</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {governanceCards.map((card) => (
              <div className={`rounded-lg border p-4 ${governanceClass(card.tone)}`} key={card.label}>
                <p className="text-sm font-semibold">{card.label}</p>
                <p className="mt-2 text-xs uppercase tracking-wide">{card.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Security Checks</h2>
          <div className="mt-5 grid gap-3">
            {securityChecks.map((check) => (
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4" key={check.label}>
                <p className="text-sm font-medium text-gray-700">{check.label}</p>
                <span className="text-sm font-semibold text-gray-900">{check.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Role Distribution</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 text-right font-medium">Users</th>
                <th className="py-3 pr-4 text-right font-medium">Percentage</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const percentage = totalUsers > 0 ? (role.users / totalUsers) * 100 : 0;
                return (
                  <tr className="border-b last:border-0" key={role.role}>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{role.role}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-gray-900">{role.users}</td>
                    <td className="py-3 pr-4 text-right text-gray-600">{percentage.toFixed(1)}%</td>
                    <td className="py-3 text-right">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(role.status)}`}>
                        {role.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflow Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">These controls are visual placeholders until role workflow APIs are wired.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {futureFeatures.map((feature) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-100 p-4 text-left text-sm font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
              disabled
              key={feature}
              type="button"
            >
              {feature}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0A9599]">Role Admin Coach</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Configured Roles" value="5" />
          <CoachMetric label="Permission Health" value="Healthy" />
          <CoachMetric label="Largest Role" value={largestRole?.role ?? "None"} />
          <CoachMetric label="Users Assigned" value={String(totalUsers)} />
        </div>
        <div className="mt-4 rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm text-gray-700">
          Review Account Manager permissions before enabling workflow actions.
        </div>
      </section>

      {/* Version 2: connect these placeholders to Keycloak role synchronization and approval workflows. */}
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
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <select
        className="h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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
