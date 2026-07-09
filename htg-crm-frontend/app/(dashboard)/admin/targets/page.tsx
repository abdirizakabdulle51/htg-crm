"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Download,
  Eye,
  FileUp,
  Pencil,
  Plus,
  Search,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";

type TargetLevel = "Company" | "Country" | "GM" | "AM";
type TargetStatus = "Configured" | "Missing";
type Quarter = "Q1" | "Q2" | "Q3" | "Q4";
type TargetCountry = "All" | "Kenya" | "Somalia" | "Ethiopia" | "Djibouti";
type ConfigurationHealth = "Healthy" | "Warning" | "Incomplete";
type WarningTone = "Healthy" | "Warning" | "Error";

type TargetRecord = {
  level: TargetLevel;
  owner: string;
  country: TargetCountry;
  quarter: Quarter;
  year: 2026 | 2025;
  target: number;
  status: TargetStatus;
};

type CoverageRecord = {
  level: TargetLevel;
  configured: number;
  missing: number;
  coverage: number;
};

type HierarchyRecord = {
  level: string;
  parent: string;
  child: string;
  configured: "Configured" | "Partial";
};

const targets: TargetRecord[] = [
  {
    level: "Company",
    owner: "HTG Clouds",
    country: "All",
    quarter: "Q3",
    year: 2026,
    target: 6900000,
    status: "Configured",
  },
  {
    level: "Country",
    owner: "Kenya",
    country: "Kenya",
    quarter: "Q3",
    year: 2026,
    target: 2400000,
    status: "Configured",
  },
  {
    level: "Country",
    owner: "Somalia",
    country: "Somalia",
    quarter: "Q3",
    year: 2026,
    target: 1500000,
    status: "Configured",
  },
  {
    level: "Country",
    owner: "Ethiopia",
    country: "Ethiopia",
    quarter: "Q3",
    year: 2026,
    target: 2000000,
    status: "Configured",
  },
  {
    level: "Country",
    owner: "Djibouti",
    country: "Djibouti",
    quarter: "Q3",
    year: 2026,
    target: 1000000,
    status: "Configured",
  },
  {
    level: "GM",
    owner: "GM Kenya",
    country: "Kenya",
    quarter: "Q3",
    year: 2026,
    target: 2400000,
    status: "Configured",
  },
  {
    level: "AM",
    owner: "Account Manager",
    country: "Kenya",
    quarter: "Q3",
    year: 2026,
    target: 1200000,
    status: "Configured",
  },
];

const countries: Exclude<TargetCountry, "All">[] = ["Kenya", "Somalia", "Ethiopia", "Djibouti"];
const expectedByLevel: Record<TargetLevel, number> = { Company: 1, Country: 4, GM: 4, AM: 4 };
const levelOptions: Array<"All" | TargetLevel> = ["All", "Company", "Country", "GM", "AM"];
const statusOptions: Array<"All" | TargetStatus> = ["All", "Configured", "Missing"];
const quarterOptions: Array<"All" | Quarter> = ["All", "Q1", "Q2", "Q3", "Q4"];
const yearOptions = ["All", "2025", "2026"] as const;

const hierarchyRows: HierarchyRecord[] = [
  { level: "Company", parent: "System", child: "HTG Clouds", configured: "Configured" },
  { level: "Country", parent: "HTG Clouds", child: "Kenya, Somalia, Ethiopia, Djibouti", configured: "Configured" },
  { level: "GM", parent: "Country", child: "Country GM", configured: "Partial" },
  { level: "Account Manager", parent: "Country GM", child: "Account Manager", configured: "Partial" },
];

const versionTwoWorkflows = [
  "Target Wizard",
  "Quarter Copy",
  "Bulk Upload",
  "Target Approval Workflow",
  "Historical Targets",
  "Forecast Generator",
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function AdminTargetsPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"All" | TargetLevel>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | TargetStatus>("All");
  const [quarterFilter, setQuarterFilter] = useState<"All" | Quarter>("All");
  const [yearFilter, setYearFilter] = useState<(typeof yearOptions)[number]>("All");

  const coverage = useMemo<CoverageRecord[]>(() => {
    return (Object.keys(expectedByLevel) as TargetLevel[]).map((level) => {
      const configured = targets.filter((target) => target.level === level && target.status === "Configured").length;
      const expected = expectedByLevel[level];
      const missing = Math.max(expected - configured, 0);
      return {
        level,
        configured,
        missing,
        coverage: Math.round((configured / expected) * 100),
      };
    });
  }, []);

  const warnings = useMemo(() => {
    const generated: Array<{ message: string; tone: WarningTone }> = [];

    if (!targets.some((target) => target.quarter === "Q4")) {
      generated.push({ message: "No Q4 targets configured", tone: "Warning" });
    }

    const amCountries = new Set(targets.filter((target) => target.level === "AM").map((target) => target.country));
    countries
      .filter((country) => !amCountries.has(country))
      .forEach((country) => {
        generated.push({ message: `AM targets missing for ${country}`, tone: "Warning" });
      });

    const gmCountries = new Set(targets.filter((target) => target.level === "GM").map((target) => target.country));
    countries
      .filter((country) => !gmCountries.has(country))
      .forEach((country) => {
        generated.push({ message: `GM targets missing for ${country}`, tone: "Warning" });
      });

    if (!targets.some((target) => target.level === "Company" && target.year > 2026)) {
      generated.push({ message: "No company target for next year", tone: "Error" });
    }

    return generated;
  }, []);

  const filteredTargets = useMemo(() => {
    const term = search.trim().toLowerCase();

    return targets.filter((target) => {
      const matchesSearch =
        !term ||
        target.owner.toLowerCase().includes(term) ||
        target.country.toLowerCase().includes(term) ||
        target.quarter.toLowerCase().includes(term);
      const matchesLevel = levelFilter === "All" || target.level === levelFilter;
      const matchesStatus = statusFilter === "All" || target.status === statusFilter;
      const matchesQuarter = quarterFilter === "All" || target.quarter === quarterFilter;
      const matchesYear = yearFilter === "All" || String(target.year) === yearFilter;

      return matchesSearch && matchesLevel && matchesStatus && matchesQuarter && matchesYear;
    });
  }, [levelFilter, quarterFilter, search, statusFilter, yearFilter]);

  const configuredTargets = targets.filter((target) => target.status === "Configured").length;
  const missingTargets = targets.filter((target) => target.status === "Missing").length;
  const totalExpectedTargets = Object.values(expectedByLevel).reduce((sum, count) => sum + count, 0);
  const totalMissingFromCoverage = coverage.reduce((sum, item) => sum + item.missing, 0);
  const totalConfiguredFromCoverage = coverage.reduce((sum, item) => sum + item.configured, 0);
  const totalCoverage = Math.round((totalConfiguredFromCoverage / totalExpectedTargets) * 100);
  const configurationHealth: ConfigurationHealth =
    totalMissingFromCoverage === 0 ? "Healthy" : totalMissingFromCoverage <= 4 ? "Warning" : "Incomplete";
  const mostUrgentIssue = warnings[0]?.message ?? "All target configurations are complete.";

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Targets</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configure company, country, GM, and Account Manager performance targets.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
        <KpiCard label="Configured Targets" value={configuredTargets} icon={Target} />
        <KpiCard label="Company Targets" value={countByLevel("Company")} icon={Target} />
        <KpiCard label="Country Targets" value={countByLevel("Country")} icon={Target} />
        <KpiCard label="GM Targets" value={countByLevel("GM")} icon={Target} />
        <KpiCard label="AM Targets" value={countByLevel("AM")} icon={Target} />
        <KpiCard label="Missing Targets" value={totalMissingFromCoverage + missingTargets} icon={AlertTriangle} />
        <KpiCard label="Target Period" value="Q3 2026" icon={Settings2} />
        <KpiCard label="Configuration Health" value={configurationHealth} icon={Settings2} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Target Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Target configuration actions will be enabled after backend workflow integration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Plus} label="Add Target" />
            <ActionButton icon={Pencil} label="Edit Target" />
            <ActionButton icon={Copy} label="Copy Quarter" />
            <ActionButton icon={FileUp} label="Import Targets" />
            <ActionButton icon={Download} label="Export Targets" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative md:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              className="h-10 w-full rounded-md border border-gray-200 pl-10 pr-3 text-sm outline-none focus:border-[#0A9599]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search owner, country, quarter"
              value={search}
            />
          </label>
          <FilterSelect label="Level" onChange={(value) => setLevelFilter(value as "All" | TargetLevel)} options={levelOptions} value={levelFilter} />
          <FilterSelect label="Status" onChange={(value) => setStatusFilter(value as "All" | TargetStatus)} options={statusOptions} value={statusFilter} />
          <FilterSelect label="Quarter" onChange={(value) => setQuarterFilter(value as "All" | Quarter)} options={quarterOptions} value={quarterFilter} />
          <FilterSelect label="Year" onChange={(value) => setYearFilter(value as (typeof yearOptions)[number])} options={[...yearOptions]} value={yearFilter} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Target Configuration</h2>
        <p className="mt-1 text-sm text-gray-500">Read-only Version 1 target setup and governance status.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">Owner</th>
                <th className="py-3 pr-4">Country</th>
                <th className="py-3 pr-4">Quarter</th>
                <th className="py-3 pr-4">Year</th>
                <th className="py-3 pr-4">Target</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map((target) => (
                <tr className="border-b last:border-0" key={`${target.level}-${target.owner}-${target.quarter}-${target.year}`}>
                  <td className="py-4 pr-4 font-semibold text-gray-800">{target.level}</td>
                  <td className="py-4 pr-4 text-gray-700">{target.owner}</td>
                  <td className="py-4 pr-4 text-gray-600">{target.country}</td>
                  <td className="py-4 pr-4 text-gray-600">{target.quarter}</td>
                  <td className="py-4 pr-4 text-gray-600">{target.year}</td>
                  <td className="py-4 pr-4 font-semibold text-gray-800">{currency.format(target.target)}</td>
                  <td className="py-4 pr-4">
                    <Badge tone={target.status}>{target.status}</Badge>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-end gap-2">
                      <TableAction icon={Eye} label="View" />
                      <TableAction icon={Pencil} label="Edit" />
                      <TableAction icon={Copy} label="Clone" />
                      <TableAction icon={Trash2} label="Delete" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {coverage.map((item) => (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" key={item.level}>
            <h2 className="text-xl font-semibold text-gray-800">{item.level}</h2>
            <div className="mt-4 grid gap-3">
              <Metric label="Configured" value={item.configured} />
              <Metric label="Missing" value={item.missing} />
              <Metric label="Coverage" value={`${item.coverage}%`} />
            </div>
          </section>
        ))}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Configuration Warnings</h2>
        <div className="mt-4 space-y-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div className={warningClass(warning.tone)} key={warning.message}>
                {warning.message}
              </div>
            ))
          ) : (
            <div className={warningClass("Healthy")}>All target configurations are complete.</div>
          )}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Target Hierarchy</h2>
        <p className="mt-1 text-sm text-gray-500">
          Targets cascade from company planning through countries, Country GMs, and Account Managers.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">Parent</th>
                <th className="py-3 pr-4">Child</th>
                <th className="py-3">Configured</th>
              </tr>
            </thead>
            <tbody>
              {hierarchyRows.map((row) => (
                <tr className="border-b last:border-0" key={row.level}>
                  <td className="py-4 pr-4 font-semibold text-gray-800">{row.level}</td>
                  <td className="py-4 pr-4 text-gray-600">{row.parent}</td>
                  <td className="py-4 pr-4 text-gray-600">{row.child}</td>
                  <td className="py-4">
                    <Badge tone={row.configured === "Configured" ? "Configured" : "Missing"}>
                      {row.configured}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Target Admin Coach</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <CoachMetric label="Configured Targets" value={configuredTargets} />
          <CoachMetric label="Coverage" value={`${totalCoverage}%`} />
          <CoachMetric label="Most Urgent Issue" value={mostUrgentIssue} />
          <CoachMetric label="Next Quarter" value="Q4 2026" />
          <CoachMetric label="Recommendation" value="Complete Somalia AM targets before opening Q4 planning." />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Workflows</h2>
        <p className="mt-1 text-sm text-gray-500">
          Target management workflows will be enabled after backend write APIs are connected.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {versionTwoWorkflows.map((workflow) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-left text-sm text-gray-400"
              disabled
              key={workflow}
              type="button"
            >
              <span className="font-semibold text-gray-500">{workflow}</span>
              <span className="mt-2 block">Coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function countByLevel(level: TargetLevel) {
  return targets.filter((target) => target.level === level).length;
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-6 text-2xl font-semibold text-gray-900">{value}</p>
    </section>
  );
}

function ActionButton({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-400"
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
      className="rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-400"
      disabled
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
      <select
        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:border-[#0A9599]"
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

function Badge({ children, tone }: { children: React.ReactNode; tone: TargetStatus }) {
  const classes =
    tone === "Configured"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-gray-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function warningClass(tone: WarningTone) {
  if (tone === "Healthy") {
    return "rounded-md border border-[#0A9599]/20 bg-[#0A9599]/5 px-4 py-3 text-sm font-semibold text-[#0A9599]";
  }

  if (tone === "Error") {
    return "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
  }

  return "rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700";
}
