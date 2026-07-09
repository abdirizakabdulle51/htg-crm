"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  Edit3,
  Eye,
  Globe2,
  MapIcon,
  Plus,
  Search,
  Settings2,
  Target,
  UserCog,
} from "lucide-react";

type CountryStatus = "Active" | "Inactive";
type AssignmentStatus = "Configured" | "Partial" | "Missing";
type DataHealth = "Healthy" | "Warning" | "Error";
type Region = "East Africa" | "Horn of Africa";

type CountryRecord = {
  name: string;
  code: string;
  region: Region;
  office: string;
  gm: string;
  status: CountryStatus;
  users: number;
  tenants: number;
  targetsConfigured: boolean;
  assignmentStatus: AssignmentStatus;
  dataHealth: DataHealth;
};

type RegionalStatus = "Healthy" | "Warning" | "Error";

type WarningRecord = {
  message: string;
  tone: RegionalStatus;
};

const countries: CountryRecord[] = [
  {
    name: "Kenya",
    code: "KE",
    region: "East Africa",
    office: "Kenya Office",
    gm: "GM Kenya",
    status: "Active",
    users: 6,
    tenants: 5,
    targetsConfigured: true,
    assignmentStatus: "Configured",
    dataHealth: "Healthy",
  },
  {
    name: "Somalia",
    code: "SO",
    region: "Horn of Africa",
    office: "Somalia Office",
    gm: "GM Somalia",
    status: "Active",
    users: 5,
    tenants: 4,
    targetsConfigured: true,
    assignmentStatus: "Configured",
    dataHealth: "Healthy",
  },
  {
    name: "Ethiopia",
    code: "ET",
    region: "Horn of Africa",
    office: "Ethiopia Office",
    gm: "GM Ethiopia",
    status: "Active",
    users: 4,
    tenants: 4,
    targetsConfigured: true,
    assignmentStatus: "Configured",
    dataHealth: "Warning",
  },
  {
    name: "Djibouti",
    code: "DJ",
    region: "Horn of Africa",
    office: "Djibouti Office",
    gm: "GM Djibouti",
    status: "Active",
    users: 3,
    tenants: 3,
    targetsConfigured: true,
    assignmentStatus: "Partial",
    dataHealth: "Warning",
  },
];

const versionTwoWorkflows = [
  "Country Editor",
  "GM Assignment Workflow",
  "Region Management",
  "Country Target Setup",
  "Office Configuration",
  "HCS Country Sync",
];

export default function AdminCountriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | CountryStatus>("All");
  const [regionFilter, setRegionFilter] = useState<"All" | Region>("All");
  const [assignmentFilter, setAssignmentFilter] = useState<"All" | AssignmentStatus>("All");
  const [dataHealthFilter, setDataHealthFilter] = useState<"All" | DataHealth>("All");

  const filteredCountries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return countries.filter((country) => {
      const matchesSearch =
        query.length === 0 ||
        [country.name, country.code, country.region, country.office, country.gm]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return (
        matchesSearch &&
        (statusFilter === "All" || country.status === statusFilter) &&
        (regionFilter === "All" || country.region === regionFilter) &&
        (assignmentFilter === "All" || country.assignmentStatus === assignmentFilter) &&
        (dataHealthFilter === "All" || country.dataHealth === dataHealthFilter)
      );
    });
  }, [assignmentFilter, dataHealthFilter, regionFilter, search, statusFilter]);

  const regionalRows = useMemo(() => {
    const groups = new Map<Region, CountryRecord[]>();
    countries.forEach((country) => {
      groups.set(country.region, [...(groups.get(country.region) ?? []), country]);
    });

    return Array.from(groups.entries()).map(([region, records]) => {
      const hasError = records.some(
        (country) =>
          !country.gm ||
          !country.targetsConfigured ||
          country.assignmentStatus === "Missing" ||
          country.dataHealth === "Error",
      );
      const hasWarning = records.some(
        (country) => country.assignmentStatus === "Partial" || country.dataHealth === "Warning",
      );

      const status: RegionalStatus = hasError ? "Error" : hasWarning ? "Warning" : "Healthy";

      return {
        region,
        countries: records.length,
        users: records.reduce((sum, country) => sum + country.users, 0),
        tenants: records.reduce((sum, country) => sum + country.tenants, 0),
        status,
      };
    });
  }, []);

  const warnings = useMemo(() => {
    const generated: WarningRecord[] = [];

    countries.forEach((country) => {
      if (country.assignmentStatus === "Partial") {
        generated.push({
          message: `${country.name} has partial assignment configuration`,
          tone: "Warning",
        });
      }
      if (country.assignmentStatus === "Missing") {
        generated.push({
          message: `${country.name} has missing assignment configuration`,
          tone: "Error",
        });
      }
      if (!country.targetsConfigured) {
        generated.push({
          message: `${country.name} target configuration is missing`,
          tone: "Error",
        });
      }
      if (country.dataHealth === "Warning") {
        generated.push({
          message: `${country.name} data quality requires review`,
          tone: "Warning",
        });
      }
      if (country.dataHealth === "Error") {
        generated.push({
          message: `${country.name} data quality has critical issues`,
          tone: "Error",
        });
      }
      if (!country.gm) {
        generated.push({
          message: `${country.name} has no GM assigned`,
          tone: "Error",
        });
      }
    });

    return generated;
  }, []);

  const fullyConfiguredCountries = countries.filter(isFullyConfigured).length;
  const configurationCoverage = Math.round((fullyConfiguredCountries / countries.length) * 100);
  const mostUrgentIssue = warnings[0]?.message ?? "No urgent country configuration issues";
  const countryDataHealth = countries.every((country) => country.dataHealth === "Healthy") ? "Healthy" : "Warning";

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Countries</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure country offices, regional structure, GM assignments, and administrative readiness.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <KpiCard icon={Globe2} label="Configured Countries" value={countries.length.toString()} />
        <KpiCard
          icon={Building2}
          label="Active Countries"
          value={countries.filter((country) => country.status === "Active").length.toString()}
        />
        <KpiCard icon={MapIcon} label="Regions Covered" value={new Set(countries.map((country) => country.region)).size.toString()} />
        <KpiCard icon={UserCog} label="Country GMs Assigned" value={countries.filter((country) => country.gm).length.toString()} />
        <KpiCard
          icon={Target}
          label="Targets Configured"
          value={countries.filter((country) => country.targetsConfigured).length.toString()}
        />
        <KpiCard
          icon={Settings2}
          label="Partial Assignments"
          value={countries.filter((country) => country.assignmentStatus === "Partial").length.toString()}
        />
        <KpiCard icon={Globe2} label="Country Data Health" value={countryDataHealth} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Country Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Country write actions will be enabled after admin backend workflows are connected.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} label="Add Country" />
            <ActionButton icon={Edit3} label="Edit Country" />
            <ActionButton icon={UserCog} label="Assign GM" />
            <ActionButton icon={Target} label="Configure Targets" />
            <ActionButton icon={Download} label="Export Countries" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="h-10 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search country, code, region, office, or GM"
              value={search}
            />
          </label>
          <FilterSelect
            label="Status"
            onChange={(value) => setStatusFilter(value as "All" | CountryStatus)}
            options={["All", "Active", "Inactive"]}
            value={statusFilter}
          />
          <FilterSelect
            label="Region"
            onChange={(value) => setRegionFilter(value as "All" | Region)}
            options={["All", "East Africa", "Horn of Africa"]}
            value={regionFilter}
          />
          <FilterSelect
            label="Assignment"
            onChange={(value) => setAssignmentFilter(value as "All" | AssignmentStatus)}
            options={["All", "Configured", "Partial", "Missing"]}
            value={assignmentFilter}
          />
          <FilterSelect
            label="Data Health"
            onChange={(value) => setDataHealthFilter(value as "All" | DataHealth)}
            options={["All", "Healthy", "Warning", "Error"]}
            value={dataHealthFilter}
          />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Country Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">Read-only Version 1 country setup and governance status.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 font-medium">Code</th>
                <th className="py-3 pr-4 font-medium">Region</th>
                <th className="py-3 pr-4 font-medium">Office</th>
                <th className="py-3 pr-4 font-medium">Country GM</th>
                <th className="py-3 pr-4 text-right font-medium">Users</th>
                <th className="py-3 pr-4 text-right font-medium">Tenants</th>
                <th className="py-3 pr-4 font-medium">Targets</th>
                <th className="py-3 pr-4 font-medium">Assignment Status</th>
                <th className="py-3 pr-4 font-medium">Data Health</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCountries.map((country) => (
                <tr className="border-b last:border-0" key={country.code}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{country.name}</td>
                  <td className="py-3 pr-4 text-gray-600">{country.code}</td>
                  <td className="py-3 pr-4 text-gray-600">{country.region}</td>
                  <td className="py-3 pr-4 text-gray-600">{country.office}</td>
                  <td className="py-3 pr-4 text-gray-600">{country.gm || "Unassigned"}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{country.users}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{country.tenants}</td>
                  <td className="py-3 pr-4">
                    <span className={badgeClass(targetClass(country.targetsConfigured))}>
                      {country.targetsConfigured ? "Configured" : "Missing"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={badgeClass(assignmentClass(country.assignmentStatus))}>{country.assignmentStatus}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={badgeClass(healthClass(country.dataHealth))}>{country.dataHealth}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={badgeClass(statusClass(country.status))}>{country.status}</span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <TableAction icon={Eye} label="View" />
                      <TableAction icon={Edit3} label="Edit" />
                      <TableAction icon={UserCog} label="Assign GM" />
                      <TableAction icon={Target} label="Configure" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Regional Structure</h2>
        <p className="mt-1 text-sm text-gray-500">Regional coverage and country administration readiness.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Region</th>
                <th className="py-3 pr-4 text-right font-medium">Countries</th>
                <th className="py-3 pr-4 text-right font-medium">Total Users</th>
                <th className="py-3 pr-4 text-right font-medium">Total Tenants</th>
                <th className="py-3 text-right font-medium">Configuration Status</th>
              </tr>
            </thead>
            <tbody>
              {regionalRows.map((region) => (
                <tr className="border-b last:border-0" key={region.region}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{region.region}</td>
                  <td className="py-3 pr-4 text-right">{region.countries}</td>
                  <td className="py-3 pr-4 text-right">{region.users}</td>
                  <td className="py-3 pr-4 text-right">{region.tenants}</td>
                  <td className="py-3 text-right">
                    <span className={badgeClass(configClass(region.status))}>{region.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Country Configuration Warnings</h2>
        <div className="mt-5 space-y-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div className={`rounded-lg border p-3 text-sm font-medium ${warningClass(warning.tone)}`} key={warning.message}>
                {warning.message}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm text-[#0A9599]">
              All countries are fully configured.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Country Admin Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <CoachMetric label="Total Countries" value={countries.length.toString()} />
          <CoachMetric label="Regions Covered" value={new Set(countries.map((country) => country.region)).size.toString()} />
          <CoachMetric label="Most Urgent Issue" value={mostUrgentIssue} />
          <CoachMetric label="Configuration Coverage" value={`${configurationCoverage}%`} />
          <CoachMetric label="Recommendation" value="Review Djibouti assignments and Ethiopia data quality before expanding country users." />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflows</h2>
        <p className="mt-1 text-sm text-gray-500">
          Country administration workflows will be enabled after backend write APIs are connected.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {versionTwoWorkflows.map((workflow) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left text-sm text-gray-500 opacity-70"
              disabled
              key={workflow}
              type="button"
            >
              <p className="font-semibold text-gray-700">{workflow}</p>
              <p className="mt-1 text-xs">Coming soon</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function isFullyConfigured(country: CountryRecord) {
  return (
    country.status === "Active" &&
    Boolean(country.gm) &&
    country.targetsConfigured &&
    country.assignmentStatus === "Configured" &&
    country.dataHealth === "Healthy"
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-4 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 opacity-70"
      disabled
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function TableAction({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
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
        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/10"
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

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function statusClass(status: CountryStatus) {
  return status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700";
}

function targetClass(configured: boolean) {
  return configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
}

function assignmentClass(status: AssignmentStatus) {
  if (status === "Configured") return "bg-green-100 text-green-700";
  if (status === "Partial") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-700";
}

function healthClass(health: DataHealth) {
  if (health === "Healthy") return "bg-green-100 text-green-700";
  if (health === "Warning") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-700";
}

function configClass(status: RegionalStatus) {
  if (status === "Healthy") return "bg-green-100 text-green-700";
  if (status === "Warning") return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-700";
}

function badgeClass(classes: string) {
  return `inline-flex rounded-full px-2 py-1 text-xs font-semibold ${classes}`;
}

function warningClass(tone: RegionalStatus) {
  if (tone === "Healthy") return "border-green-200 bg-green-50 text-green-800";
  if (tone === "Warning") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-red-200 bg-red-50 text-red-800";
}
