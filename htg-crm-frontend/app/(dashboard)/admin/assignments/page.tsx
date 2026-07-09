"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Edit3,
  Eye,
  Link2,
  Search,
  Settings2,
  Shuffle,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

type AssignmentStatus = "Assigned" | "Partial" | "Unassigned";
type AssignmentHealth = "Healthy" | "Warning" | "Error";
type Country = "Kenya" | "Somalia" | "Ethiopia" | "Djibouti";
type CountryOwnerStatus = "Configured" | "Missing" | "Partial";
type CoverageStatus = "Healthy" | "Warning" | "Critical";
type GapTone = "Healthy" | "Warning" | "Error";

type AssignmentRecord = {
  customer: string;
  country: Country;
  sector: string;
  accountManager: string;
  gm: string;
  status: AssignmentStatus;
  health: AssignmentHealth;
};

type CountryOwner = {
  country: Country;
  gm: string;
  status: CountryOwnerStatus;
};

type GapRecord = {
  message: string;
  tone: GapTone;
};

const assignments: AssignmentRecord[] = [
  {
    customer: "Kenya Tenant 01",
    country: "Kenya",
    sector: "Telecom",
    accountManager: "Account Manager",
    gm: "GM Kenya",
    status: "Assigned",
    health: "Healthy",
  },
  {
    customer: "Kenya Tenant 02",
    country: "Kenya",
    sector: "Finance",
    accountManager: "Account Manager",
    gm: "GM Kenya",
    status: "Assigned",
    health: "Healthy",
  },
  {
    customer: "Kenya Tenant 04",
    country: "Kenya",
    sector: "Healthcare",
    accountManager: "Unassigned",
    gm: "GM Kenya",
    status: "Unassigned",
    health: "Warning",
  },
  {
    customer: "Somalia Tenant 01",
    country: "Somalia",
    sector: "Telecom",
    accountManager: "Somalia AM",
    gm: "GM Somalia",
    status: "Assigned",
    health: "Healthy",
  },
  {
    customer: "Djibouti Tenant 02",
    country: "Djibouti",
    sector: "Logistics",
    accountManager: "Unassigned",
    gm: "GM Djibouti",
    status: "Partial",
    health: "Warning",
  },
];

const countryOwners: CountryOwner[] = [
  { country: "Kenya", gm: "GM Kenya", status: "Configured" },
  { country: "Somalia", gm: "GM Somalia", status: "Configured" },
  { country: "Ethiopia", gm: "GM Ethiopia", status: "Configured" },
  { country: "Djibouti", gm: "GM Djibouti", status: "Configured" },
];

const versionTwoWorkflows = [
  "Drag-and-drop Assignment Board",
  "Bulk Assignment Rules",
  "Territory Balancing",
  "Assignment Approval Workflow",
  "Ownership History",
  "HCS Ownership Sync",
];

const countries: Array<"All" | Country> = ["All", "Kenya", "Somalia", "Ethiopia", "Djibouti"];
const statuses: Array<"All" | AssignmentStatus> = ["All", "Assigned", "Partial", "Unassigned"];
const healthStatuses: Array<"All" | AssignmentHealth> = ["All", "Healthy", "Warning", "Error"];

export default function AdminAssignmentsPage() {
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<"All" | Country>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | AssignmentStatus>("All");
  const [healthFilter, setHealthFilter] = useState<"All" | AssignmentHealth>("All");

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const matchesSearch =
        query.length === 0 ||
        [
          assignment.customer,
          assignment.country,
          assignment.sector,
          assignment.accountManager,
          assignment.gm,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return (
        matchesSearch &&
        (countryFilter === "All" || assignment.country === countryFilter) &&
        (statusFilter === "All" || assignment.status === statusFilter) &&
        (healthFilter === "All" || assignment.health === healthFilter)
      );
    });
  }, [countryFilter, healthFilter, search, statusFilter]);

  const gaps = useMemo(() => {
    const generated: GapRecord[] = [];

    assignments.forEach((assignment) => {
      if (assignment.accountManager === "Unassigned") {
        generated.push({
          message: `${assignment.customer} has no Account Manager assigned`,
          tone: "Warning",
        });
      }
      if (assignment.status === "Partial") {
        generated.push({
          message: `${assignment.customer} assignment is incomplete`,
          tone: "Warning",
        });
      }
    });

    countryOwners.forEach((owner) => {
      if (!owner.gm || owner.status === "Missing") {
        generated.push({
          message: `${owner.country} has no Country GM assigned`,
          tone: "Error",
        });
      }
    });

    return generated;
  }, []);

  const coverageRows = useMemo(() => {
    const groups = new Map<Country, AssignmentRecord[]>();
    assignments.forEach((assignment) => {
      groups.set(assignment.country, [...(groups.get(assignment.country) ?? []), assignment]);
    });

    return Array.from(groups.entries()).map(([country, records]) => {
      const assigned = records.filter(
        (assignment) => assignment.status === "Assigned" && assignment.accountManager !== "Unassigned",
      ).length;
      const unassigned = records.filter(
        (assignment) => assignment.status === "Unassigned" || assignment.accountManager === "Unassigned",
      ).length;
      const coverage = records.length === 0 ? 0 : Math.round((assigned / records.length) * 100);
      const status: CoverageStatus = coverage === 100 ? "Healthy" : coverage >= 70 ? "Warning" : "Critical";

      return {
        country,
        total: records.length,
        assigned,
        unassigned,
        coverage,
        status,
      };
    });
  }, []);

  const assignedCustomers = assignments.filter((assignment) => assignment.status === "Assigned").length;
  const unassignedCustomers = assignments.filter(
    (assignment) => assignment.accountManager === "Unassigned" || assignment.status === "Unassigned",
  ).length;
  const partialAssignments = assignments.filter((assignment) => assignment.status === "Partial").length;
  const coverage = Math.round((assignedCustomers / assignments.length) * 100);
  const assignmentHealth = unassignedCustomers === 0 && partialAssignments === 0 ? "Healthy" : "Warning";
  const affectedCountries = coverageRows
    .map((row) => ({ country: row.country, gaps: row.unassigned + (row.status === "Critical" ? 1 : 0) }))
    .sort((a, b) => b.gaps - a.gaps);
  const mostAffectedCountry = affectedCountries[0]?.gaps ? affectedCountries[0].country : "None";
  const mostUrgentIssue = gaps[0]?.message ?? "No urgent assignment issues";

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Assignments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage customer ownership, GM assignments, and Account Manager allocation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <KpiCard icon={Link2} label="Total Assignments" value={assignments.length.toString()} />
        <KpiCard icon={UserCheck} label="Assigned Customers" value={assignedCustomers.toString()} />
        <KpiCard icon={AlertTriangle} label="Unassigned Customers" value={unassignedCustomers.toString()} />
        <KpiCard icon={Settings2} label="Partial Assignments" value={partialAssignments.toString()} />
        <KpiCard icon={UserCog} label="Countries With GM" value={countryOwners.filter((owner) => owner.gm).length.toString()} />
        <KpiCard icon={Users} label="Assignment Health" value={assignmentHealth} />
        <KpiCard icon={Link2} label="Coverage %" value={`${coverage}%`} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Assignment Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Assignment write actions will be enabled after backend workflow integration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={UserPlus} label="Assign Customer" />
            <ActionButton icon={Shuffle} label="Reassign AM" />
            <ActionButton icon={UserCog} label="Assign GM" />
            <ActionButton icon={Settings2} label="Bulk Assign" />
            <ActionButton icon={Download} label="Export Assignments" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-md border border-gray-200 pl-10 pr-3 text-sm outline-none transition focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, country, sector, AM, or GM"
              type="search"
              value={search}
            />
          </label>
          <FilterSelect label="Country" onChange={setCountryFilter} options={countries} value={countryFilter} />
          <FilterSelect label="Assignment Status" onChange={setStatusFilter} options={statuses} value={statusFilter} />
          <FilterSelect label="Health" onChange={setHealthFilter} options={healthStatuses} value={healthFilter} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Customer Assignment Table</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Customer</th>
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 font-medium">Sector</th>
                <th className="py-3 pr-4 font-medium">Account Manager</th>
                <th className="py-3 pr-4 font-medium">Country GM</th>
                <th className="py-3 pr-4 font-medium">Assignment Status</th>
                <th className="py-3 pr-4 font-medium">Health</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((assignment) => (
                <tr className="border-b last:border-0" key={`${assignment.customer}-${assignment.country}`}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{assignment.customer}</td>
                  <td className="py-3 pr-4 text-gray-600">{assignment.country}</td>
                  <td className="py-3 pr-4 text-gray-600">{assignment.sector}</td>
                  <td className="py-3 pr-4">
                    {assignment.accountManager === "Unassigned" ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        Unassigned
                      </span>
                    ) : (
                      <span className="text-gray-700">{assignment.accountManager}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{assignment.gm}</td>
                  <td className="py-3 pr-4">
                    <Badge label={assignment.status} tone={assignmentStatusClass(assignment.status)} />
                  </td>
                  <td className="py-3 pr-4">
                    <Badge label={assignment.health} tone={healthClass(assignment.health)} />
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <TableAction icon={UserPlus} label="Assign" />
                      <TableAction icon={Shuffle} label="Reassign" />
                      <TableAction icon={Eye} label="View" />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAssignments.length === 0 && (
                <tr>
                  <td className="py-6 text-sm text-gray-500" colSpan={8}>
                    No assignments match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Country Ownership</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Country GM</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {countryOwners.map((owner) => (
                  <tr className="border-b last:border-0" key={owner.country}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{owner.country}</td>
                    <td className="py-3 pr-4 text-gray-600">{owner.gm || "Unassigned"}</td>
                    <td className="py-3 pr-4">
                      <Badge label={owner.status} tone={countryOwnerStatusClass(owner.status)} />
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-2">
                        <TableAction icon={UserCog} label="Assign GM" />
                        <TableAction icon={Edit3} label="Edit" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Assignment Gaps</h2>
          <div className="mt-5 grid gap-3">
            {gaps.length > 0 ? (
              gaps.map((gap) => (
                <div className={`rounded-lg border p-4 text-sm font-medium ${gapClass(gap.tone)}`} key={gap.message}>
                  {gap.message}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                All customer and country assignments are complete.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Assignment Coverage by Country</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 text-right font-medium">Total Customers</th>
                <th className="py-3 pr-4 text-right font-medium">Assigned</th>
                <th className="py-3 pr-4 text-right font-medium">Unassigned</th>
                <th className="py-3 pr-4 text-right font-medium">Coverage %</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((row) => (
                <tr className="border-b last:border-0" key={row.country}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.country}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{row.total}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">{row.assigned}</td>
                  <td className="py-3 pr-4 text-right text-gray-700">{row.unassigned}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{row.coverage}%</td>
                  <td className="py-3 text-right">
                    <Badge label={row.status} tone={coverageStatusClass(row.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0A9599]">Assignment Admin Coach</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Assignment Coverage" value={`${coverage}%`} />
          <CoachMetric label="Unassigned Customers" value={unassignedCustomers.toString()} />
          <CoachMetric label="Most Affected Country" value={mostAffectedCountry} />
          <CoachMetric label="Most Urgent Issue" value={mostUrgentIssue} />
        </div>
        <div className="mt-4 rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm font-medium text-gray-700">
          Assign Kenya Tenant 04 and Djibouti Tenant 02 before enabling AM workflow actions.
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflow Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">
          Assignment workflows will be enabled after backend write APIs are connected.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {versionTwoWorkflows.map((workflow) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-400"
              disabled
              key={workflow}
              type="button"
            >
              <span className="font-medium text-gray-500">{workflow}</span>
              <span className="mt-1 block text-xs">Coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
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
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-8 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-400"
      disabled
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TableAction({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400"
      disabled
      title={label}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: T[];
  value: T;
}) {
  return (
    <select
      aria-label={label}
      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
      onChange={(event) => onChange(event.target.value as T)}
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

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{label}</span>;
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function assignmentStatusClass(status: AssignmentStatus) {
  if (status === "Assigned") return "bg-emerald-100 text-emerald-700";
  if (status === "Partial") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function healthClass(health: AssignmentHealth) {
  if (health === "Healthy") return "bg-emerald-100 text-emerald-700";
  if (health === "Warning") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function countryOwnerStatusClass(status: CountryOwnerStatus) {
  if (status === "Configured") return "bg-emerald-100 text-emerald-700";
  if (status === "Partial") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function coverageStatusClass(status: CoverageStatus) {
  if (status === "Healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "Warning") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function gapClass(tone: GapTone) {
  if (tone === "Healthy") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (tone === "Warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-red-200 bg-red-50 text-red-700";
}
