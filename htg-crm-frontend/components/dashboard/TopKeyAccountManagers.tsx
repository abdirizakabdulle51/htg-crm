"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { achievementPercent, tenantARR } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { PipelineOverview, Tenant } from "@/types/crm";

export type KeyAccountManagerPerformance = "Excellent" | "Good" | "Needs Attention" | "Critical";

export type KeyAccountManagerRow = {
  name: string;
  country: string;
  arrManaged: number;
  pipelineValue: number;
  wonThisMonth: number;
  activeTenants: number;
  atRiskTenants: number;
  performance: KeyAccountManagerPerformance;
  score: number;
};

type TopKeyAccountManagersProps = {
  managers: KeyAccountManagerRow[];
};

const COUNTRIES = ["Kenya", "Somalia", "Ethiopia", "Djibouti"] as const;

const FALLBACK_ROWS: Record<(typeof COUNTRIES)[number], Omit<KeyAccountManagerRow, "performance" | "score">> = {
  Kenya: {
    name: "Account Manager",
    country: "Kenya",
    arrManaged: 1890000,
    pipelineValue: 1150000,
    wonThisMonth: 450000,
    activeTenants: 5,
    atRiskTenants: 1,
  },
  Somalia: {
    name: "AM Somalia",
    country: "Somalia",
    arrManaged: 1236000,
    pipelineValue: 990000,
    wonThisMonth: 0,
    activeTenants: 4,
    atRiskTenants: 1,
  },
  Ethiopia: {
    name: "AM Ethiopia",
    country: "Ethiopia",
    arrManaged: 1800000,
    pipelineValue: 940000,
    wonThisMonth: 0,
    activeTenants: 4,
    atRiskTenants: 0,
  },
  Djibouti: {
    name: "AM Djibouti",
    country: "Djibouti",
    arrManaged: 828000,
    pipelineValue: 430000,
    wonThisMonth: 0,
    activeTenants: 3,
    atRiskTenants: 0,
  },
};

function performanceFromScore(score: number, atRiskTenants: number): KeyAccountManagerPerformance {
  if (score >= 90 && atRiskTenants <= 1) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Attention";
  return "Critical";
}

function performanceClass(performance: KeyAccountManagerPerformance) {
  switch (performance) {
    case "Excellent":
      return "bg-emerald-100 text-emerald-700";
    case "Good":
      return "bg-blue-100 text-blue-700";
    case "Needs Attention":
      return "bg-amber-100 text-amber-700";
    case "Critical":
      return "bg-red-100 text-red-700";
  }
}

function tenantCountry(tenant: Tenant) {
  return tenant.country ?? "Unassigned";
}

export function buildKeyAccountManagers({
  tenants,
  pipeline,
  countryTargets,
}: {
  tenants?: Tenant[] | null;
  pipeline?: PipelineOverview | null;
  countryTargets?: Record<string, number>;
}) {
  const rows = tenants ?? [];
  const hasTenantData = rows.length > 0;
  const pipelineByCountry = new Map((pipeline?.by_country ?? []).map((country) => [country.country, country.value]));
  const wonThisMonth = pipeline?.won_this_month?.value ?? 0;

  // Version 2: real Account Manager ownership will replace this mock ranking.
  return COUNTRIES.map((country) => {
    const fallback = FALLBACK_ROWS[country];
    const countryTenants = rows.filter((tenant) => tenantCountry(tenant) === country);
    const arrManaged = countryTenants.length
      ? countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0)
      : hasTenantData
        ? 0
        : fallback.arrManaged;
    const activeTenants = countryTenants.length
      ? countryTenants.filter((tenant) => (tenant.status ?? "").toUpperCase() === "ACTIVE").length
      : hasTenantData
        ? 0
        : fallback.activeTenants;
    const atRiskTenants = countryTenants.length
      ? countryTenants.filter((tenant) => (tenant.risk_score ?? 0) > 50 || (tenant.status ?? "").toUpperCase() === "AT_RISK").length
      : hasTenantData
        ? 0
        : fallback.atRiskTenants;
    const pipelineValue = pipelineByCountry.get(country) ?? fallback.pipelineValue;
    const countryWon = country === "Kenya" ? wonThisMonth || fallback.wonThisMonth : fallback.wonThisMonth;
    const score = achievementPercent(arrManaged, countryTargets?.[country] ?? fallback.arrManaged);

    return {
      ...fallback,
      arrManaged,
      pipelineValue,
      wonThisMonth: countryWon,
      activeTenants,
      atRiskTenants,
      performance: performanceFromScore(score, atRiskTenants),
      score,
    };
  }).sort((a, b) => b.score - a.score || b.arrManaged - a.arrManaged);
}

export function TopKeyAccountManagers({ managers }: TopKeyAccountManagersProps) {
  const topPerformer = managers[0];
  const highestPipeline = managers.slice().sort((a, b) => b.pipelineValue - a.pipelineValue)[0];
  const mostWon = managers.slice().sort((a, b) => b.wonThisMonth - a.wonThisMonth)[0];
  const highestARR = managers.slice().sort((a, b) => b.arrManaged - a.arrManaged)[0];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Top Key Account Managers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Top Performer" value={topPerformer ? `${topPerformer.name} (${topPerformer.country})` : "Not available"} />
          <Summary
            label="Highest Pipeline"
            value={highestPipeline ? `${highestPipeline.name} - ${formatUSD(highestPipeline.pipelineValue)}` : "Not available"}
          />
          <Summary label="Most Won" value={mostWon ? `${mostWon.name} - ${formatUSD(mostWon.wonThisMonth)}` : "Not available"} />
          <Summary label="Highest ARR" value={highestARR ? `${highestARR.name} - ${formatUSD(highestARR.arrManaged)}` : "Not available"} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Rank</th>
                <th className="py-3 pr-4 font-medium">Account Manager</th>
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 text-right font-medium">ARR Managed</th>
                <th className="py-3 pr-4 text-right font-medium">Pipeline Value</th>
                <th className="py-3 pr-4 text-right font-medium">Won This Month</th>
                <th className="py-3 pr-4 text-right font-medium">Active Tenants</th>
                <th className="py-3 pr-4 text-right font-medium">At-Risk Tenants</th>
                <th className="py-3 text-right font-medium">Performance</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((manager, index) => (
                <tr className="border-b last:border-0" key={`${manager.country}-${manager.name}`}>
                  <td className="py-3 pr-4 font-semibold">{index + 1}</td>
                  <td className="py-3 pr-4 font-semibold">{manager.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{manager.country}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(manager.arrManaged)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(manager.pipelineValue)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(manager.wonThisMonth)}</td>
                  <td className="py-3 pr-4 text-right">{manager.activeTenants}</td>
                  <td className="py-3 pr-4 text-right">{manager.atRiskTenants}</td>
                  <td className="py-3 text-right">
                    <Badge className={cn("whitespace-nowrap", performanceClass(manager.performance))}>{manager.performance}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
