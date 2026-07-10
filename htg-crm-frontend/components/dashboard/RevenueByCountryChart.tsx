"use client";

import { useRouter } from "next/navigation";
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

type ChartClickEntry = {
  name?: string;
  payload?: {
    name?: string;
  };
};

export function RevenueByCountryChart({ countries, tenants, team, countryTargets }: RevenueByCountryChartProps) {
  const router = useRouter();
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
  const openCountry = (countryName?: string) => {
    if (!countryName) return;
    router.push(`/country-performance?country=${encodeURIComponent(countryName)}`);
  };
  const openCountryFromChart = (entry: ChartClickEntry) => openCountry(entry.payload?.name ?? entry.name);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Revenue by Country</CardTitle>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-4rem)]">
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-4 focus-within:top-4 focus-within:z-10 focus-within:flex focus-within:flex-wrap focus-within:gap-2 focus-within:rounded-md focus-within:border focus-within:bg-background focus-within:p-2 focus-within:shadow-sm">
          {rows.map((row) => (
            <a
              className="rounded px-2 py-1 text-xs font-medium text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
              href={`/country-performance?country=${encodeURIComponent(row.name)}`}
              key={row.name}
            >
              View {row.name}
            </a>
          ))}
        </div>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={rows}
            margin={{ bottom: 8, left: 0, right: 0, top: 8 }}
            role="img"
            aria-label="Revenue by country. Select a country bar to view country performance details."
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatUSD(value)} />
            <Bar
              className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
              dataKey="pipeline_value"
              fill="#2563eb"
              name="Pipeline value"
              onClick={openCountryFromChart}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
              dataKey="tenant_arr"
              fill="#0f766e"
              name="Tenant ARR"
              onClick={openCountryFromChart}
              radius={[4, 4, 0, 0]}
            />
            <Line dataKey="target" dot={false} name="Target" stroke="#f59e0b" strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
