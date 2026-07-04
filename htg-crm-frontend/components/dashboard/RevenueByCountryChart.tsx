"use client";

import { Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueByCountry } from "@/components/dashboard/mock-data";
import { quarterlyTarget, tenantARR } from "@/components/dashboard/executive-utils";
import { formatUSD } from "@/lib/utils";
import type { PipelineCountryBreakdown, TeamTarget, Tenant } from "@/types/crm";

type RevenueByCountryChartProps = {
  countries?: PipelineCountryBreakdown[] | null;
  tenants?: Tenant[] | null;
  team?: TeamTarget[] | null;
  countryTargets?: Record<string, number>;
};

export function RevenueByCountryChart({ countries, tenants, team, countryTargets }: RevenueByCountryChartProps) {
  const rows = countries?.length
    ? countries.map((country) => {
        const countryTenantARR = (tenants ?? [])
          .filter((tenant) => tenant.country_id === country.country_id)
          .reduce((sum, tenant) => sum + tenantARR(tenant), 0);
        const target =
          countryTargets?.[country.country] ??
          (team ?? [])
            .filter((member) => member.country_office_id === country.country_id)
            .reduce((sum, member) => sum + quarterlyTarget(member), 0);

        return {
          name: country.country,
          pipeline_value: country.value,
          tenant_arr: countryTenantARR,
          target,
        };
      })
    : revenueByCountry.map((item) => ({
        name: item.name,
        pipeline_value: item.revenue,
        tenant_arr: item.revenue * 0.7,
        target: countryTargets?.[item.name] ?? item.target ?? 0,
      }));

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Revenue by Country</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows} margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatUSD(value)} />
            <Bar dataKey="pipeline_value" fill="#2563eb" name="Pipeline value" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tenant_arr" fill="#0f766e" name="Tenant ARR" radius={[4, 4, 0, 0]} />
            <Line dataKey="target" dot={false} name="Target" stroke="#f59e0b" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
