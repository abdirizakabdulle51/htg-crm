"use client";

import { BrainCircuit } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantARR } from "@/components/dashboard/executive-utils";
import type { KeyAccountManagerRow } from "@/components/dashboard/TopKeyAccountManagers";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type ExecutiveAISummaryProps = {
  tenants?: Tenant[] | null;
  q3Achieved?: number;
  q3Target?: number;
  countryTargets?: Record<string, number>;
  topAccountManager?: KeyAccountManagerRow | null;
};

function healthScore(tenant: Tenant) {
  const value = (tenant as Tenant & { health_score?: number }).health_score;
  return typeof value === "number" ? value : 0;
}

export function ExecutiveAISummary({
  tenants,
  q3Achieved = 0,
  q3Target = 0,
  countryTargets,
  topAccountManager,
}: ExecutiveAISummaryProps) {
  const rows = tenants ?? [];
  const averageHealth = rows.length
    ? rows.reduce((sum, tenant) => sum + healthScore(tenant), 0) / rows.length
    : 0;
  const forecastProbability = q3Target > 0 ? (q3Achieved / q3Target) * 100 : 0;
  const largestTenant = rows.slice().sort((a, b) => tenantARR(b) - tenantARR(a))[0];
  const highestRiskTenant = rows.slice().sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))[0];
  const countryARR = rows.reduce<Record<string, number>>((acc, tenant) => {
    const country = tenant.country ?? "Unassigned";
    acc[country] = (acc[country] ?? 0) + tenantARR(tenant);
    return acc;
  }, {});
  const biggestGap = Object.entries(countryTargets ?? {})
    .map(([country, target]) => ({ country, gap: target - (countryARR[country] ?? 0) }))
    .sort((a, b) => b.gap - a.gap)[0];
  const recommendation =
    biggestGap && biggestGap.gap > 0
      ? `Focus executive attention on ${biggestGap.country}; it has the largest Q3 ARR gap at ${formatUSD(biggestGap.gap)}.${
          topAccountManager
            ? ` Top performing Account Manager: ${topAccountManager.name} in ${topAccountManager.country}.`
            : ""
        }`
      : "Maintain current execution cadence; country-level ARR is tracking at or above target.";

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-[#0A9599]" />
          Executive AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4rem)] gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <SummaryMetric label="Company Health Score" value={`${Math.round(averageHealth * 100)}%`} />
          <SummaryMetric label="Forecast Probability" value={`${forecastProbability.toFixed(1)}%`} />
          <SummaryMetric
            label="Largest ARR Tenant"
            value={largestTenant ? `${largestTenant.name} (${formatUSD(tenantARR(largestTenant))})` : "No tenant data"}
          />
          <SummaryMetric
            label="Highest Risk Tenant"
            value={highestRiskTenant ? `${highestRiskTenant.name} (${highestRiskTenant.risk_score ?? 0})` : "No risk data"}
          />
          <SummaryMetric
            label="Top Account Manager"
            value={
              topAccountManager
                ? `${topAccountManager.name} (${topAccountManager.country}, ${topAccountManager.performance})`
                : "No AM ranking yet"
            }
          />
        </div>
        <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-900">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">Recommendation</p>
          <p className="mt-1 leading-5">{recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
