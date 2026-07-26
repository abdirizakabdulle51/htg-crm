"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { achievementPercent, isAtRiskTenant, tenantARR } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

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
const COUNTRY_BY_ID: Record<string, (typeof COUNTRIES)[number]> = {
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

type LeadRow = {
  country?: string;
  country_id?: string;
  countryId?: string;
  stage?: string | number;
  stage_number?: number;
  stageNumber?: number;
  stage_name?: string;
  stageName?: string;
  status?: string;
  value_usd?: number;
  valueUsd?: number;
  potential_value_usd?: number;
  won_date?: string | null;
  wonDate?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
};

const FALLBACK_ROWS: Record<(typeof COUNTRIES)[number], Omit<KeyAccountManagerRow, "performance" | "score">> = {
  Kenya: {
    name: "Account Manager",
    country: "Kenya",
    arrManaged: 1890000,
    pipelineValue: 0,
    wonThisMonth: 0,
    activeTenants: 5,
    atRiskTenants: 1,
  },
  Somalia: {
    name: "AM Somalia",
    country: "Somalia",
    arrManaged: 1236000,
    pipelineValue: 0,
    wonThisMonth: 0,
    activeTenants: 4,
    atRiskTenants: 1,
  },
  Ethiopia: {
    name: "AM Ethiopia",
    country: "Ethiopia",
    arrManaged: 1800000,
    pipelineValue: 0,
    wonThisMonth: 0,
    activeTenants: 4,
    atRiskTenants: 0,
  },
  Djibouti: {
    name: "AM Djibouti",
    country: "Djibouti",
    arrManaged: 828000,
    pipelineValue: 0,
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
  return tenant.country ?? (tenant.country_id ? COUNTRY_BY_ID[tenant.country_id] : undefined) ?? "Unassigned";
}

function leadCountry(lead: LeadRow) {
  return lead.country ?? (lead.country_id ? COUNTRY_BY_ID[lead.country_id] : undefined) ?? (lead.countryId ? COUNTRY_BY_ID[lead.countryId] : undefined);
}

function leadValue(lead: LeadRow) {
  return lead.value_usd ?? lead.valueUsd ?? lead.potential_value_usd ?? 0;
}

function leadStageNumber(lead: LeadRow) {
  if (typeof lead.stage_number === "number") return lead.stage_number;
  if (typeof lead.stageNumber === "number") return lead.stageNumber;
  if (typeof lead.stage === "number") return lead.stage;
  if (typeof lead.stage === "string") {
    const parsed = Number.parseInt(lead.stage, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isOpenLead(lead: LeadRow) {
  const stageNumber = leadStageNumber(lead);
  if (typeof stageNumber === "number" && [9, 10, 11].includes(stageNumber)) return false;

  const stateText = [lead.stage, lead.stage_name, lead.stageName, lead.status]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return !["WON", "LOST", "DORMANT", "CLOSED"].some((token) => stateText.includes(token));
}

function isWonThisMonth(lead: LeadRow) {
  if (leadStageNumber(lead) !== 9) return false;
  const value = lead.won_date ?? lead.wonDate ?? lead.updated_at ?? lead.updatedAt;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export function buildKeyAccountManagers({
  tenants,
  leads,
  countryTargets,
}: {
  tenants?: Tenant[] | null;
  leads?: LeadRow[] | null;
  countryTargets?: Record<string, number>;
}) {
  const rows = tenants ?? [];
  const leadRows = leads ?? [];
  const hasTenantData = rows.length > 0;

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
      ? countryTenants.filter(isAtRiskTenant).length
      : hasTenantData
        ? 0
        : fallback.atRiskTenants;
    const countryLeads = leadRows.filter((lead) => leadCountry(lead) === country);
    const pipelineValue = countryLeads.filter(isOpenLead).reduce((sum, lead) => sum + leadValue(lead), 0);
    const countryWon = countryLeads.filter(isWonThisMonth).reduce((sum, lead) => sum + leadValue(lead), 0);
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
