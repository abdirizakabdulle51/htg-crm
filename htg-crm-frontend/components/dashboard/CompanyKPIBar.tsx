"use client";

import { Card as TremorCard, Metric, Text } from "@tremor/react";
import Link from "next/link";

import { formatUSD } from "@/lib/utils";
import type { ForecastResponse, PipelineOverview, TeamTarget, Tenant } from "@/types/crm";
import { currentQuarter, isAtRiskTenant, quarterlyTarget, tenantARR } from "@/components/dashboard/executive-utils";

type CompanyKPIBarProps = {
  pipeline?: PipelineOverview | null;
  team?: TeamTarget[] | null;
  forecast?: ForecastResponse | null;
  tenants?: Tenant[] | null;
  q3Target?: number;
};

export function CompanyKPIBar({ pipeline, team, forecast, tenants, q3Target }: CompanyKPIBarProps) {
  const rows = team ?? [];
  const tenantRows = tenants ?? [];
  const target = q3Target ?? rows.reduce((sum, member) => sum + quarterlyTarget(member), 0);
  const achieved = rows.reduce((sum, member) => sum + member.achieved_usd, 0);
  const totalARR = tenantRows.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const activeTenants = tenantRows.filter((tenant) => tenant.status === "ACTIVE").length;
  const atRiskTenants = tenantRows.filter(isAtRiskTenant).length;

  const cards = [
    { label: "Total ARR", value: formatUSD(totalARR), href: "/revenue?view=arr" },
    { label: `Q${currentQuarter()} Target`, value: formatUSD(target), href: "/revenue?view=targets" },
    { label: `Q${currentQuarter()} Achieved`, value: formatUSD(achieved), href: "/revenue?view=achievement" },
    {
      label: `Q${currentQuarter()} Forecast`,
      value: formatUSD(forecast?.adjusted_forecast_usd ?? 0),
      href: "/revenue?view=forecast",
    },
    { label: "Active Tenants", value: activeTenants.toLocaleString("en-US"), href: "/strategic-risks?filter=active" },
    { label: "At-Risk Tenants", value: atRiskTenants.toLocaleString("en-US"), href: "/strategic-risks?filter=at-risk" },
    { label: "Pipeline Value", value: formatUSD(pipeline?.total_value_usd ?? 0), href: "/country-performance?view=pipeline" },
    { label: "Won This Month", value: formatUSD(pipeline?.won_this_month?.value ?? 0), href: "/revenue?view=won" },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      {cards.map((card) => (
        <Link
          aria-label={`View ${card.label} details`}
          className="group block h-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          href={card.href}
          key={card.label}
          onKeyDown={(event) => {
            if (event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <TremorCard className="h-full cursor-pointer rounded-lg border shadow-sm transition duration-150 group-hover:border-indigo-300 group-hover:shadow-md">
            <Text>{card.label}</Text>
            <Metric className="mt-1 break-words text-xl tracking-tight xl:text-2xl 2xl:text-3xl">{card.value}</Metric>
          </TremorCard>
        </Link>
      ))}
    </div>
  );
}
