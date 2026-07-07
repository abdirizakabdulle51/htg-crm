"use client";

import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRIES = ["Somalia", "Kenya", "Ethiopia", "Djibouti"];
const PIPELINE_VALUE = 3540000;

const mockGMRows = [
  { gm: "GM Kenya", country: "Kenya", arr: 2100000, target: 2400000, atRisk: 1 },
  { gm: "GM Somalia", country: "Somalia", arr: 1236000, target: 1500000, atRisk: 1 },
  { gm: "GM Ethiopia", country: "Ethiopia", arr: 1776000, target: 2000000, atRisk: 1 },
  { gm: "GM Djibouti", country: "Djibouti", arr: 852000, target: 1000000, atRisk: 0 },
];

const strategicOpportunities = [
  { name: "Banking Expansion", value: 450000, country: "Kenya", stage: "Proposal" },
  { name: "Government Cloud", value: 300000, country: "Ethiopia", stage: "Qualified" },
  { name: "Telecom Backup", value: 220000, country: "Somalia", stage: "Negotiation" },
  { name: "Healthcare DR", value: 180000, country: "Djibouti", stage: "Prospect" },
  { name: "Logistics Platform", value: 390000, country: "Kenya", stage: "Proposal" },
  { name: "Finance Cloud", value: 260000, country: "Ethiopia", stage: "Qualified" },
];

type TenantRow = {
  id?: string;
  name?: string;
  country?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  risk_score?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  monthly_revenue_usd?: number | null;
  mrr_usd?: number | null;
  health_score?: number | null;
  healthScore?: number | null;
  health?: string | null;
};

type TargetRow = {
  country?: string | null;
  account_manager_id?: string | null;
  target_arr?: number | null;
  target_arr_usd?: number | null;
  targetArrUsd?: number | null;
  achieved_arr?: number | null;
  achieved_arr_usd?: number | null;
  achievedArrUsd?: number | null;
};

type TeamTargetRow = {
  achieved_usd?: number | null;
};

type AlertRow = {
  tone: "red" | "yellow" | "green";
  message: string;
};

function unwrapList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
}

function tenantARR(tenant: TenantRow) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: TenantRow) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function targetARR(target: TargetRow) {
  return target.target_arr_usd ?? target.target_arr ?? target.targetArrUsd ?? 0;
}

function achievementClass(value: number) {
  if (value >= 80) return "text-green-700";
  if (value >= 60) return "text-yellow-700";
  return "text-red-700";
}

function alertClass(tone: AlertRow["tone"]) {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-green-200 bg-green-50 text-green-800";
}

function stageClass(stage: string) {
  if (stage === "Negotiation") return "bg-teal-100 text-teal-700";
  if (stage === "Proposal") return "bg-blue-100 text-blue-700";
  if (stage === "Qualified") return "bg-yellow-100 text-yellow-700";
  return "bg-purple-100 text-purple-700";
}

export default function HOBDashboard() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [teamTargets, setTeamTargets] = useState<TeamTargetRow[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API}/api/v1/tenants`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTenants(unwrapList<TenantRow>(json.data, ["tenants", "items"])))
      .catch(() => setTenants([]));

    fetch(`${API}/api/v1/targets?quarter=3&year=2026`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTargets(unwrapList<TargetRow>(json.data ?? json, ["targets", "items"])))
      .catch(() => setTargets([]));

    fetch(`${API}/api/v1/targets/team`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTeamTargets(unwrapList<TeamTargetRow>(json.data ?? json, ["team", "items"])))
      .catch(() => setTeamTargets([]));
  }, [status, session]);

  const countryTargets = useMemo(() => targets.filter((target) => !target.account_manager_id), [targets]);

  const countryRows = useMemo(() => {
    return COUNTRIES.map((country) => {
      const countryTenants = tenants.filter((tenant) => tenant.country === country);
      const countryARR = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
      const countryTarget = countryTargets
        .filter((target) => target.country === country)
        .reduce((sum, target) => sum + targetARR(target), 0);
      const atRiskTenants = countryTenants.filter((tenant) => (tenant.risk_score ?? 0) > 50).length;
      const achievement = countryTarget > 0 ? (countryARR / countryTarget) * 100 : 0;

      return {
        country,
        arr: countryARR,
        target: countryTarget,
        achievement,
        atRiskTenants,
        pipeline: country === "Kenya" ? 840000 : country === "Ethiopia" ? 560000 : country === "Somalia" ? 420000 : 260000,
      };
    });
  }, [countryTargets, tenants]);

  const sectorRows = useMemo(() => {
    const totals = tenants.reduce((map, tenant) => {
      const sector = tenantSector(tenant);
      const current = map.get(sector) ?? { sector, arr: 0, count: 0 };
      current.arr += tenantARR(tenant);
      current.count += 1;
      map.set(sector, current);
      return map;
    }, new Map<string, { sector: string; arr: number; count: number }>());

    return Array.from(totals.values()).sort((a, b) => b.arr - a.arr);
  }, [tenants]);

  const companyARR = tenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const q3Target = countryTargets.reduce((sum, target) => sum + targetARR(target), 0);
  const q3Achieved = teamTargets.reduce((sum, target) => sum + (target.achieved_usd ?? 0), 0);
  const q3Forecast = q3Achieved + PIPELINE_VALUE * 0.25;
  const revenueGap = Math.max(q3Target - q3Achieved, 0);
  const atRiskRevenue = tenants
    .filter((tenant) => (tenant.risk_score ?? 0) > 50)
    .reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const countriesBehind = countryRows.filter((row) => row.target > 0 && row.arr < row.target).length;
  const companyHealth =
    tenants.length > 0 ? tenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / tenants.length : 0;
  const forecastConfidence = q3Target > 0 ? (q3Achieved / q3Target) * 100 : 0;
  const weakestCountry = [...countryRows].filter((row) => row.target > 0).sort((a, b) => a.achievement - b.achievement)[0];
  const strongestSector = sectorRows[0];

  const alerts = useMemo(() => {
    const rows: AlertRow[] = [];
    countryRows.forEach((country) => {
      if (country.target > 0 && country.arr < country.target * 0.85) {
        rows.push({ tone: "red", message: `${country.country} is more than 15% below Q3 target.` });
      }
      if (country.target > 0 && country.achievement < 70) {
        rows.push({ tone: "yellow", message: `${country.country} achievement is below 70%.` });
      }
      if (country.target > 0 && country.achievement > 90) {
        rows.push({ tone: "green", message: `${country.country} is above 90% Q3 achievement.` });
      }
    });
    if (atRiskRevenue > 200000) {
      rows.push({ tone: "red", message: `At-risk ARR is ${formatUSD(atRiskRevenue)}, above the $200,000 intervention threshold.` });
    }
    const atRiskTenantCount = tenants.filter((tenant) => (tenant.risk_score ?? 0) > 50).length;
    if (atRiskTenantCount > 2) {
      rows.push({ tone: "yellow", message: `${atRiskTenantCount} tenants are at risk across the company.` });
    }
    return rows.slice(0, 6);
  }, [atRiskRevenue, countryRows, tenants]);

  const recommendation = weakestCountry
    ? `Prioritize a commercial intervention plan for ${weakestCountry.country}; it has the lowest Q3 achievement.`
    : "Prioritize country target reviews once Q3 achievement data is available.";

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Company ARR" value={formatUSD(companyARR)} />
        <KpiCard label="Q3 Target" value={formatUSD(q3Target)} />
        <KpiCard label="Q3 Achieved" value={formatUSD(q3Achieved)} />
        <KpiCard label="Q3 Forecast" value={formatUSD(q3Forecast)} />
        <KpiCard label="Revenue Gap" value={formatUSD(revenueGap)} />
        <KpiCard label="Pipeline Value" value={formatUSD(PIPELINE_VALUE)} />
        <KpiCard label="At-Risk Revenue" value={formatUSD(atRiskRevenue)} />
        <KpiCard label="Countries Behind" value={countriesBehind.toString()} />
      </div>

      <Section title="Country Performance Comparison" subtitle="Cross-country target achievement and intervention view.">
        <div className="grid gap-3 xl:grid-cols-4">
          {countryRows.map((row) => (
            <div className="rounded-lg border border-gray-200 p-4" key={row.country}>
              <p className="text-sm font-semibold text-gray-900">{row.country}</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{formatUSD(row.arr)}</p>
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <p>Q3 Target: {formatUSD(row.target)}</p>
                <p className={achievementClass(row.achievement)}>Achievement: {row.achievement.toFixed(1)}%</p>
                <p>At-Risk Tenants: {row.atRiskTenants}</p>
                <p>Pipeline: {formatUSD(row.pipeline)}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sector Performance" subtitle="ARR concentration and tenant count by sector.">
        <Table>
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 text-right font-medium">Total ARR</th>
              <th className="py-3 pr-4 text-right font-medium">% of Company ARR</th>
              <th className="py-3 text-right font-medium">Tenant Count</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((row) => (
              <tr className="border-b last:border-0" key={row.sector}>
                <td className="py-3 pr-4 font-medium text-gray-900">{row.sector}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(row.arr)}</td>
                <td className="py-3 pr-4 text-right">{companyARR > 0 ? ((row.arr / companyARR) * 100).toFixed(1) : "0.0"}%</td>
                <td className="py-3 text-right">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="GM Performance Snapshot" subtitle="Static GM execution snapshot while assignments are being wired.">
        <Table>
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">GM</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Country ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Q3 Target</th>
              <th className="py-3 pr-4 text-right font-medium">Achievement %</th>
              <th className="py-3 pr-4 text-right font-medium">At-Risk Tenants</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockGMRows.map((row) => {
              const achievement = row.target > 0 ? (row.arr / row.target) * 100 : 0;
              return (
                <tr className="border-b last:border-0" key={row.gm}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{row.gm}</td>
                  <td className="py-3 pr-4 text-gray-500">{row.country}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(row.arr)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(row.target)}</td>
                  <td className={`py-3 pr-4 text-right font-semibold ${achievementClass(achievement)}`}>
                    {achievement.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-right">{row.atRisk}</td>
                  <td className="py-3 text-right">{achievement >= 80 ? "On Track" : "Intervention"}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Commercial Alerts" subtitle="Auto-generated intervention signals from target and tenant data.">
        <div className="space-y-3">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <div className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${alertClass(alert.tone)}`} key={alert.message}>
                {alert.tone === "green" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{alert.message}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No commercial alerts at this time.</p>
          )}
        </div>
      </Section>

      <Section title="Strategic Opportunities" subtitle="Top commercial opportunities for cross-country intervention.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {strategicOpportunities.map((opportunity) => (
            <div className="rounded-lg border border-gray-200 p-4" key={`${opportunity.name}-${opportunity.country}`}>
              <p className="font-semibold text-gray-900">{opportunity.name}</p>
              <p className="mt-1 text-sm text-gray-500">{opportunity.country}</p>
              <p className="mt-4 text-2xl font-semibold text-gray-900">{formatUSD(opportunity.value)}</p>
              <span className={`mt-3 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageClass(opportunity.stage)}`}>
                {opportunity.stage}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#0A9599]" />
          <h2 className="text-xl font-semibold text-[#0A9599]">Commercial Coach</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Company health score" value={`${companyHealth.toFixed(0)}%`} />
          <CoachMetric label="Q3 forecast confidence" value={`${forecastConfidence.toFixed(1)}%`} />
          <CoachMetric label="Weakest country" value={weakestCountry ? weakestCountry.country : "Not available"} />
          <CoachMetric label="Strongest sector" value={strongestSector ? strongestSector.sector : "Not available"} />
        </div>
        <div className="mt-4 rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm text-gray-700">
          <TrendingUp className="mr-2 inline h-4 w-4 text-[#0A9599]" />
          {recommendation}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Section({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">{children}</table>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
