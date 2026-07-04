"use client";

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

export function RevenueBySectoChart({ sectors, tenants }: RevenueBySectoChartProps) {
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

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Revenue by Sector</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows} margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={11} interval={0} tickLine={false} />
            <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatUSD(value)} />
            <Bar dataKey="pipeline_value" fill="#7c3aed" name="Pipeline value" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tenant_arr" fill="#14b8a6" name="Tenant ARR" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
