"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRIES = ["Somalia", "Kenya", "Ethiopia", "Djibouti"];

const COUNTRY_GMS: Record<string, string> = {
  Somalia: "GM Somalia",
  Kenya: "GM Kenya",
  Ethiopia: "GM Ethiopia",
  Djibouti: "GM Djibouti",
};

const COUNTRY_BY_ID: Record<string, string> = {
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

type TenantRow = {
  id?: string;
  name?: string | null;
  country?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  status?: string | null;
  risk_score?: number | null;
  riskScore?: number | null;
  arr?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  monthly_revenue_usd?: number | null;
  monthlyRevenueUsd?: number | null;
  mrr?: number | null;
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
};

type LeadRow = {
  country?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  tenant_country?: string | null;
  tenant?: {
    country?: string | null;
  } | null;
  value?: number | null;
  potential_value?: number | null;
  value_usd?: number | null;
  valueUsd?: number | null;
  potential_value_usd?: number | null;
  estimated_value?: number | null;
  deal_value?: number | null;
  amount?: number | null;
};

type CountryGMRow = {
  activeTenants: number;
  achievement: number;
  arr: number;
  atRiskRevenue: number;
  country: string;
  gm: string;
  healthScore: number;
  pipeline: number;
  target: number;
};

type CoachingPriority = {
  message: string;
  tone: "critical" | "warning" | "growth";
};

type AuthSession = {
  accessToken?: string;
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

function tenantCountry(tenant: TenantRow) {
  return (
    tenant.country ??
    tenant.country_name ??
    tenant.countryName ??
    (tenant.country_id ? COUNTRY_BY_ID[tenant.country_id] : undefined) ??
    "Unassigned"
  );
}

function leadCountry(lead: LeadRow) {
  return (
    lead.country ??
    lead.country_name ??
    lead.countryName ??
    lead.tenant_country ??
    lead.tenant?.country ??
    (lead.country_id ? COUNTRY_BY_ID[lead.country_id] : undefined) ??
    "Unassigned"
  );
}

function tenantARR(tenant: TenantRow) {
  return (
    tenant.arr_usd ??
    tenant.arrUsd ??
    tenant.arr ??
    (tenant.monthly_revenue_usd ?? tenant.monthlyRevenueUsd ?? tenant.mrr_usd ?? tenant.mrr ?? 0) * 12
  );
}

function leadValue(lead: LeadRow) {
  return (
    lead.value ??
    lead.potential_value ??
    lead.estimated_value ??
    lead.deal_value ??
    lead.amount ??
    lead.value_usd ??
    lead.valueUsd ??
    lead.potential_value_usd ??
    0
  );
}

function tenantRiskScore(tenant: TenantRow) {
  return tenant.risk_score ?? tenant.riskScore ?? 0;
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;

  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;

  return Math.max(0, 100 - tenantRiskScore(tenant));
}

function targetARR(target: TargetRow) {
  return target.target_arr_usd ?? target.target_arr ?? target.targetArrUsd ?? 0;
}

function statusFor(achievement: number) {
  if (achievement >= 90) return "Leading";
  if (achievement >= 80) return "On Track";
  return "Needs Intervention";
}

function statusClass(status: string) {
  if (status === "Leading") return "bg-green-100 text-green-700";
  if (status === "On Track") return "bg-[#0A9599]/10 text-[#0A9599]";
  return "bg-red-100 text-red-700";
}

function trendFor(pipeline: number, arr: number) {
  const ratio = arr > 0 ? pipeline / arr : 0;
  if (ratio >= 0.5) return "Growing";
  if (ratio >= 0.2) return "Stable";
  return "Declining";
}

function trendClass(trend: string) {
  if (trend === "Growing") return "text-green-600";
  if (trend === "Stable") return "text-yellow-600";
  return "text-red-600";
}

function trendLabel(trend: string) {
  if (trend === "Growing") return "↑ Growing";
  if (trend === "Stable") return "→ Stable";
  return "↓ Declining";
}

function priorityClass(tone: CoachingPriority["tone"]) {
  if (tone === "critical") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "growth") return "border-green-200 bg-green-50 text-green-800";
  return "border-yellow-200 bg-yellow-50 text-yellow-800";
}

export default function HOBTeamsPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = (session as AuthSession).accessToken ?? "";
    if (!token) {
      setIsLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };
    setIsLoading(true);

    Promise.all([
      fetch(`${API}/api/v1/tenants`, {
        headers,
        credentials: "include",
      })
        .then((response) => response.json())
        .then((json) => unwrapList<TenantRow>(json.data ?? json, ["tenants", "items", "results"]))
        .catch(() => []),
      fetch(`${API}/api/v1/targets?quarter=3&year=2026`, {
        headers,
        credentials: "include",
      })
        .then((response) => response.json())
        .then((json) => unwrapList<TargetRow>(json.data ?? json, ["targets", "items", "results"]))
        .catch(() => []),
      fetch(`${API}/api/v1/leads`, {
        headers,
        credentials: "include",
      })
        .then((response) => response.json())
        .then((json) => unwrapList<LeadRow>(json.data ?? json, ["leads", "items", "results"]))
        .catch(() => []),
    ])
      .then(([tenantRows, targetRows, leadRows]) => {
        setTenants(tenantRows);
        setTargets(targetRows);
        setLeads(leadRows);
      })
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const countryTargets = useMemo(() => targets.filter((target) => !target.account_manager_id), [targets]);

  const countryRows = useMemo<CountryGMRow[]>(() => {
    return COUNTRIES.map((country) => {
      const countryTenants = tenants.filter((tenant) => tenantCountry(tenant) === country);
      const countryLeads = leads.filter((lead) => leadCountry(lead) === country);
      const arr = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
      const target = countryTargets
        .filter((targetRow) => targetRow.country === country)
        .reduce((sum, targetRow) => sum + targetARR(targetRow), 0);
      const pipeline = countryLeads.reduce((sum, lead) => sum + leadValue(lead), 0);
      const healthScore =
        countryTenants.length > 0
          ? countryTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / countryTenants.length
          : 0;

      return {
        activeTenants: countryTenants.filter((tenant) => tenant.status === "ACTIVE").length,
        achievement: target > 0 ? (arr / target) * 100 : 0,
        arr,
        atRiskRevenue: countryTenants
          .filter((tenant) => tenantRiskScore(tenant) > 50)
          .reduce((sum, tenant) => sum + tenantARR(tenant), 0),
        country,
        gm: COUNTRY_GMS[country],
        healthScore,
        pipeline,
        target,
      };
    });
  }, [countryTargets, leads, tenants]);

  const metrics = useMemo(() => {
    const totalARR = countryRows.reduce((sum, country) => sum + country.arr, 0);
    const totalPipeline = countryRows.reduce((sum, country) => sum + country.pipeline, 0);
    const totalAtRiskRevenue = countryRows.reduce((sum, country) => sum + country.atRiskRevenue, 0);
    const averageAchievement =
      countryRows.length > 0 ? countryRows.reduce((sum, country) => sum + country.achievement, 0) / countryRows.length : 0;
    const gmsNeedingAttention = countryRows.filter(
      (country) => country.achievement < 80 || country.healthScore < 75,
    ).length;

    return { averageAchievement, gmsNeedingAttention, totalARR, totalAtRiskRevenue, totalPipeline };
  }, [countryRows]);

  const leaderboard = useMemo(
    () => [...countryRows].sort((a, b) => b.achievement - a.achievement),
    [countryRows],
  );

  const coachingPriorities = useMemo<CoachingPriority[]>(() => {
    const priorities: CoachingPriority[] = [];

    countryRows.forEach((country) => {
      if (country.achievement < 80) {
        priorities.push({
          message: `Coach ${country.gm} on pipeline generation.`,
          tone: "critical",
        });
      }

      if (country.atRiskRevenue > 250_000) {
        priorities.push({
          message: `Support ${country.gm} on strategic customer retention.`,
          tone: "warning",
        });
      }

      if (country.healthScore < 70) {
        priorities.push({
          message: `Executive intervention recommended for ${country.gm}.`,
          tone: "critical",
        });
      }

      if (country.arr > 0 && country.pipeline >= country.arr * 0.5) {
        priorities.push({
          message: `Expand sector opportunities with ${country.gm}.`,
          tone: "growth",
        });
      }
    });

    return priorities;
  }, [countryRows]);

  const commercialCoach = useMemo(() => {
    const byAchievement = [...countryRows].sort((a, b) => b.achievement - a.achievement);
    const byAttention = [...countryRows].sort((a, b) => {
      const aNeeds = a.achievement < 80 || a.healthScore < 75 ? 1 : 0;
      const bNeeds = b.achievement < 80 || b.healthScore < 75 ? 1 : 0;
      if (bNeeds !== aNeeds) return bNeeds - aNeeds;
      return a.achievement - b.achievement;
    });
    const byARR = [...countryRows].sort((a, b) => b.arr - a.arr);
    const byPipeline = [...countryRows].sort((a, b) => b.pipeline - a.pipeline);

    const best = byAchievement[0];
    const attention = byAttention[0];
    const highestARR = byARR[0];
    const highestPipeline = byPipeline[0];

    return {
      attention,
      best,
      highestARR,
      highestPipeline,
      recommendation:
        attention && highestARR
          ? `Prioritize coaching for ${attention.country} while supporting ${highestARR.country} on strategic account expansion.`
          : "Review country execution priorities with each GM this week.",
    };
  }, [countryRows]);

  if (status === "loading" || isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Commercial Teams</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor Country General Manager performance, commercial execution, coaching priorities, and regional performance.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Total Country GMs" value="4" />
        <KpiCard label="Total ARR Managed" value={formatUSD(metrics.totalARR)} />
        <KpiCard label="Average Achievement %" value={`${metrics.averageAchievement.toFixed(1)}%`} />
        <KpiCard label="Total Pipeline Value" value={formatUSD(metrics.totalPipeline)} />
        <KpiCard label="Total At-Risk Revenue" value={formatUSD(metrics.totalAtRiskRevenue)} />
        <KpiCard label="GMs Needing Attention" value={metrics.gmsNeedingAttention.toString()} />
      </div>

      <Section title="Commercial Team" subtitle="Country GM performance against Q3 execution priorities.">
        <Table minWidth="1120px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">GM</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Q3 Target</th>
              <th className="py-3 pr-4 text-right font-medium">Achievement %</th>
              <th className="py-3 pr-4 text-right font-medium">Pipeline Value</th>
              <th className="py-3 pr-4 text-right font-medium">At-Risk Revenue</th>
              <th className="py-3 pr-4 text-right font-medium">Active Tenants</th>
              <th className="py-3 pr-4 text-right font-medium">Health Score</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {countryRows.map((country) => {
              const statusText = statusFor(country.achievement);
              return (
                <tr className="border-b last:border-0" key={country.country}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{country.gm}</td>
                  <td className="py-3 pr-4 text-gray-500">{country.country}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(country.arr)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(country.target)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-[#0A9599]">{country.achievement.toFixed(1)}%</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(country.pipeline)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(country.atRiskRevenue)}</td>
                  <td className="py-3 pr-4 text-right">{country.activeTenants}</td>
                  <td className="py-3 pr-4 text-right">{country.healthScore.toFixed(0)}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(statusText)}`}>
                      {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Team Leaderboard" subtitle="Country GMs ranked by Q3 target achievement.">
        <Table minWidth="760px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Rank</th>
              <th className="py-3 pr-4 font-medium">GM</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Achievement %</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 text-right font-medium">Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((country, index) => (
              <tr className="border-b last:border-0" key={`${country.country}-leaderboard`}>
                <td className="py-3 pr-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0A9599]/10 text-sm font-semibold text-[#0A9599]">
                    {index + 1}
                  </span>
                </td>
                <td className="py-3 pr-4 font-medium text-gray-900">{country.gm}</td>
                <td className="py-3 pr-4 text-gray-500">{country.country}</td>
                <td className="py-3 pr-4 text-right font-semibold text-[#0A9599]">{country.achievement.toFixed(1)}%</td>
                <td className="py-3 pr-4 text-right">{formatUSD(country.arr)}</td>
                <td className="py-3 text-right">{formatUSD(country.pipeline)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Coaching Priorities" subtitle="Auto-generated commercial coaching recommendations by GM.">
        <div className="space-y-3">
          {coachingPriorities.length > 0 ? (
            coachingPriorities.map((priority) => (
              <div className={`rounded-lg border p-3 text-sm font-medium ${priorityClass(priority.tone)}`} key={priority.message}>
                {priority.message}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm text-[#0A9599]">
              All Country GMs are tracking within expected commercial ranges.
            </p>
          )}
        </div>
      </Section>

      <Section title="Country Comparison" subtitle="ARR, pipeline, health, and growth trend by country team.">
        <Table minWidth="820px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">GM</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Pipeline</th>
              <th className="py-3 pr-4 text-right font-medium">Health</th>
              <th className="py-3 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {countryRows.map((country) => {
              const trend = trendFor(country.pipeline, country.arr);
              return (
                <tr className="border-b last:border-0" key={`${country.country}-comparison`}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{country.country}</td>
                  <td className="py-3 pr-4 text-gray-500">{country.gm}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(country.arr)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(country.pipeline)}</td>
                  <td className="py-3 pr-4 text-right">{country.healthScore.toFixed(0)}</td>
                  <td className={`py-3 text-right font-semibold ${trendClass(trend)}`}>{trendLabel(trend)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0A9599]">Commercial Coach</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Best Performing GM" value={commercialCoach.best?.gm ?? "Not available"} />
          <CoachMetric label="GM Requiring Attention" value={commercialCoach.attention?.gm ?? "Not available"} />
          <CoachMetric label="Highest ARR Country" value={commercialCoach.highestARR?.country ?? "Not available"} />
          <CoachMetric label="Highest Pipeline Country" value={commercialCoach.highestPipeline?.country ?? "Not available"} />
        </div>
        <p className="mt-5 text-sm text-gray-700">{commercialCoach.recommendation}</p>
      </section>
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

function Table({ children, minWidth }: { children: React.ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
