"use client";

import { Card as TremorCard, Metric, Text } from "@tremor/react";

import { formatUSD } from "@/lib/utils";
import type { ForecastResponse, PipelineOverview, TeamTarget, Tenant } from "@/types/crm";
import { currentQuarter, quarterlyTarget, tenantARR } from "@/components/dashboard/executive-utils";

type CompanyKPIBarProps = {
  pipeline?: PipelineOverview | null;
  team?: TeamTarget[] | null;
  forecast?: ForecastResponse | null;
  tenants?: Tenant[] | null;
  atRisk?: Tenant[] | null;
  q3Target?: number;
};

export function CompanyKPIBar({ pipeline, team, forecast, tenants, atRisk, q3Target }: CompanyKPIBarProps) {
  const rows = team ?? [];
  const tenantRows = tenants ?? [];
  const target = q3Target ?? rows.reduce((sum, member) => sum + quarterlyTarget(member), 0);
  const achieved = rows.reduce((sum, member) => sum + member.achieved_usd, 0);
  const totalARR = tenantRows.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const activeTenants = tenantRows.filter((tenant) => tenant.status === "ACTIVE").length;

  const cards = [
    { label: "Total ARR", value: formatUSD(totalARR) },
    { label: `Q${currentQuarter()} Target`, value: formatUSD(target) },
    { label: `Q${currentQuarter()} Achieved`, value: formatUSD(achieved) },
    { label: `Q${currentQuarter()} Forecast`, value: formatUSD(forecast?.adjusted_forecast_usd ?? 0) },
    { label: "Active Tenants", value: activeTenants.toLocaleString("en-US") },
    { label: "At-Risk Tenants", value: (atRisk?.length ?? 0).toLocaleString("en-US") },
    { label: "Pipeline Value", value: formatUSD(pipeline?.total_value_usd ?? 0) },
    { label: "Won This Month", value: formatUSD(pipeline?.won_this_month?.value ?? 0) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {cards.map((card) => (
        <TremorCard className="rounded-lg border shadow-sm" key={card.label}>
          <Text>{card.label}</Text>
          <Metric className="mt-1 text-xl">{card.value}</Metric>
        </TremorCard>
      ))}
    </div>
  );
}
