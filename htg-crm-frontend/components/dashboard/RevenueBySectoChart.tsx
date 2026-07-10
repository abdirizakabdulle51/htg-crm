"use client";

import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueBySector } from "@/components/dashboard/mock-data";
import { tenantARR } from "@/components/dashboard/executive-utils";
import { formatUSD } from "@/lib/utils";
import type { PipelineSectorBreakdown, Tenant } from "@/types/crm";

type RevenueBySectoChartProps = {
  sectors?: PipelineSectorBreakdown[] | null;
  tenants?: Tenant[] | null;
};

type ChartClickEntry = {
  name?: string;
  payload?: {
    name?: string;
  };
};

export function RevenueBySectoChart({ sectors, tenants }: RevenueBySectoChartProps) {
  const router = useRouter();
  const rows = sectors?.length
    ? sectors.map((sector) => ({
        name: sector.sector,
        pipeline_value: sector.value,
        tenant_arr: (tenants ?? [])
          .filter((tenant) => tenant.sector_id === sector.sector_id)
          .reduce((sum, tenant) => sum + tenantARR(tenant), 0),
      }))
    : revenueBySector.map((item) => ({
        name: item.name,
        pipeline_value: item.revenue,
        tenant_arr: item.revenue * 0.65,
      }));
  const openSector = (sectorName?: string) => {
    if (!sectorName) return;
    router.push(`/revenue?sector=${encodeURIComponent(sectorName)}`);
  };
  const openSectorFromChart = (entry: ChartClickEntry) => openSector(entry.payload?.name ?? entry.name);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Revenue by Sector</CardTitle>
      </CardHeader>
      <CardContent className="relative h-[calc(100%-4rem)]">
        <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:inset-x-4 focus-within:top-4 focus-within:z-10 focus-within:flex focus-within:flex-wrap focus-within:gap-2 focus-within:rounded-md focus-within:border focus-within:bg-background focus-within:p-2 focus-within:shadow-sm">
          {rows.map((row) => (
            <a
              className="rounded px-2 py-1 text-xs font-medium text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
              href={`/revenue?sector=${encodeURIComponent(row.name)}`}
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
            aria-label="Revenue by sector. Select a sector bar to view revenue sector details."
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={11} interval={0} tickLine={false} />
            <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatUSD(value)} />
            <Bar
              className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
              dataKey="pipeline_value"
              fill="#7c3aed"
              name="Pipeline value"
              onClick={openSectorFromChart}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              className="cursor-pointer outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
              dataKey="tenant_arr"
              fill="#14b8a6"
              name="Tenant ARR"
              onClick={openSectorFromChart}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
