"use client";

import { useMemo, useState } from "react";
import {
  Download,
  KeyRound,
  MailPlus,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";

type UserRole = "CEO" | "Head of Business" | "Country GM" | "Account Manager" | "Admin";
type UserStatus = "Active" | "Inactive" | "Suspended";
type UserSource = "Keycloak" | "Local CRM" | "Imported";

type UserRecord = {
  name: string;
  email: string;
  role: UserRole;
  country: string;
  status: UserStatus;
  source: UserSource;
  lastLogin: string;
};

const users: UserRecord[] = [
  {
    name: "CEO User",
    email: "ceo@test.com",
    role: "CEO",
    country: "All",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Today",
  },
  {
    name: "Head of Business",
    email: "hob@test.com",
    role: "Head of Business",
    country: "All",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Today",
  },
  {
    name: "GM Kenya",
    email: "gm.kenya@test.com",
    role: "Country GM",
    country: "Kenya",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Yesterday",
  },
  {
    name: "GM Somalia",
    email: "gm.somalia@test.com",
    role: "Country GM",
    country: "Somalia",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Yesterday",
  },
  {
    name: "Account Manager",
    email: "am@test.com",
    role: "Account Manager",
    country: "Kenya",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Today",
  },
  {
    name: "CRM Admin",
    email: "admin@test.com",
    role: "Admin",
    country: "All",
    status: "Active",
    source: "Keycloak",
    lastLogin: "Today",
  },
  {
    name: "Inactive User",
    email: "inactive@test.com",
    role: "Account Manager",
    country: "Kenya",
    status: "Inactive",
    source: "Local CRM",
    lastLogin: "30 days ago",
  },
];

const roleOptions = ["All", "CEO", "Head of Business", "Country GM", "Account Manager", "Admin"] as const;
const statusOptions = ["All", "Active", "Inactive", "Suspended"] as const;
const sourceOptions = ["All", "Keycloak", "Local CRM", "Imported"] as const;

const actionButtons = [
  { label: "Add User", icon: UserCog },
  { label: "Invite User", icon: MailPlus },
  { label: "Reset Password", icon: KeyRound },
  { label: "Deactivate User", icon: UserMinus },
  { label: "Export Users", icon: Download },
];

function statusClass(status: UserStatus) {
  if (status === "Active") return "bg-emerald-100 text-emerald-700";
  if (status === "Suspended") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function roleClass(role: UserRole) {
  if (role === "CEO") return "bg-slate-900 text-white";
  if (role === "Head of Business") return "bg-[#0A9599]/10 text-[#0A9599]";
  if (role === "Country GM") return "bg-emerald-100 text-emerald-700";
  if (role === "Account Manager") return "bg-purple-100 text-purple-700";
  return "bg-red-100 text-red-700";
}

function sourceClass(source: UserSource) {
  if (source === "Keycloak") return "bg-emerald-100 text-emerald-700";
  if (source === "Local CRM") return "bg-blue-100 text-blue-700";
  return "bg-orange-100 text-orange-700";
}

function loginRisk(lastLogin: string) {
  const lower = lastLogin.toLowerCase();
  const daysMatch = lower.match(/(\d+)\s+days?/);
  const days = daysMatch ? Number(daysMatch[1]) : 0;

  if (days >= 30) return { label: "Review", className: "bg-red-100 text-red-700" };
  if (days >= 7) return { label: "Watch", className: "bg-amber-100 text-amber-700" };
  return { label: "Normal", className: "bg-emerald-100 text-emerald-700" };
}

function roleStatus(roleUsers: UserRecord[]) {
  const inactive = roleUsers.filter((user) => user.status === "Inactive").length;
  const suspended = roleUsers.filter((user) => user.status === "Suspended").length;

  if (suspended > 0) return `${suspended} suspended`;
  if (inactive > 0) return `${inactive} inactive`;
  return "Active";
}

function mostCommonRole(userList: UserRecord[]) {
  const counts = roleOptions
    .filter((role): role is UserRole => role !== "All")
    .map((role) => ({
      role,
      count: userList.filter((user) => user.role === role).length,
    }))
    .sort((a, b) => b.count - a.count);

  return counts[0]?.role ?? "None";
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof roleOptions)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>("All");
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceOptions)[number]>("All");

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        term.length === 0 ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      const matchesSource = sourceFilter === "All" || user.source === sourceFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesSource;
    });
  }, [roleFilter, search, sourceFilter, statusFilter]);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.status === "Active").length;
  const inactiveUsers = users.filter((user) => user.status === "Inactive").length;
  const adminUsers = users.filter((user) => user.role === "Admin").length;
  const countryGMs = users.filter((user) => user.role === "Country GM").length;
  const accountManagers = users.filter((user) => user.role === "Account Manager").length;

  const roleDistribution = roleOptions
    .filter((role): role is UserRole => role !== "All")
    .map((role) => {
      const roleUsers = users.filter((user) => user.role === role);
      return {
        role,
        users: roleUsers.length,
        status: roleStatus(roleUsers),
      };
    });

  const reviewLoginUsers = users.filter((user) => loginRisk(user.lastLogin).label === "Review").length;
  const missingCountryUsers = users.filter((user) => !user.country || user.country === "Unassigned").length;
  const warnings = [
    inactiveUsers > 0 ? "Inactive users detected" : null,
    missingCountryUsers > 0 ? "Users without country assignment" : null,
    adminUsers > 1 ? "Multiple administrators configured" : null,
    reviewLoginUsers > 0 ? "Users inactive for over 30 days" : null,
  ].filter(Boolean);

  const mostUrgentIssue =
    reviewLoginUsers > 0
      ? "Users inactive for over 30 days"
      : inactiveUsers > 0
        ? "Inactive users detected"
        : "No urgent issue";

  const kpis = [
    { label: "Total Users", value: totalUsers, icon: Users },
    { label: "Active Users", value: activeUsers, icon: UserCheck },
    { label: "Inactive Users", value: inactiveUsers, icon: UserX },
    { label: "Admin Users", value: adminUsers, icon: ShieldCheck },
    { label: "Country GMs", value: countryGMs, icon: UserCog },
    { label: "Account Managers", value: accountManagers, icon: Users },
  ];

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-[#0A9599]">User management</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Users</h1>
        <p className="mt-2 text-sm text-gray-500">Manage CRM users, access, roles, countries, and account status.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        <h2 className="text-xl font-semibold text-gray-800">Search &amp; Filters</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-11 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect
            label="Role"
            onChange={(value) => setRoleFilter(value as (typeof roleOptions)[number])}
            options={roleOptions}
            value={roleFilter}
          />
          <FilterSelect
            label="Status"
            onChange={(value) => setStatusFilter(value as (typeof statusOptions)[number])}
            options={statusOptions}
            value={statusFilter}
          />
          <FilterSelect
            label="Source"
            onChange={(value) => setSourceFilter(value as (typeof sourceOptions)[number])}
            options={sourceOptions}
            value={sourceFilter}
          />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">User Actions</h2>
        <div className="mt-5 flex flex-wrap gap-3">
          {actionButtons.map(({ label, icon: Icon }) => (
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
        <p className="mt-4 text-sm text-gray-500">
          Administrative write actions will be enabled after backend workflow integration.
        </p>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Users Table</h2>
            <p className="mt-1 text-sm text-gray-500">{filteredUsers.length} users match the current filters.</p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Email</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Last Login</th>
                <th className="py-3 pr-4 font-medium">Last Login Risk</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const risk = loginRisk(user.lastLogin);
                return (
                  <tr className="border-b last:border-0" key={user.email}>
                    <td className="py-3 pr-4 font-semibold text-gray-900">{user.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{user.email}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{user.country}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sourceClass(user.source)}`}>
                        {user.source}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{user.lastLogin}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${risk.className}`}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {["Edit", "Deactivate", "Reset Password"].map((action) => (
                          <button
                            className="rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 disabled:cursor-not-allowed disabled:opacity-75"
                            disabled
                            key={action}
                            type="button"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-gray-500" colSpan={9}>
                    No users match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Role Distribution</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 text-right font-medium">Users</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {roleDistribution.map((row) => (
                <tr className="border-b last:border-0" key={row.role}>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${roleClass(row.role)}`}>
                      {row.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900">{row.users}</td>
                  <td className="py-3 text-right text-gray-600">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Access Warnings</h2>
        <div className="mt-5 grid gap-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800" key={warning}>
                {warning}
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              No user access issues detected.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0A9599]">User Admin Coach</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Total Active Users" value={String(activeUsers)} />
          <CoachMetric label="Most Common Role" value={mostCommonRole(users)} />
          <CoachMetric label="Inactive Users" value={String(inactiveUsers)} />
          <CoachMetric label="Most Urgent Issue" value={mostUrgentIssue} />
        </div>
        <div className="mt-4 rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm text-gray-700">
          Review inactive users before onboarding additional Account Managers.
        </div>
      </section>

      {/* Version 2: replace mock users with Keycloak synchronization and enabled user lifecycle workflows. */}
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
