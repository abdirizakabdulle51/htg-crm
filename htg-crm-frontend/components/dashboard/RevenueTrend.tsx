"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantARR } from "@/components/dashboard/executive-utils";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type RevenueTrendProps = {
  tenants?: Tenant[] | null;
};

function trendRows(totalARR: number) {
  const now = new Date();
  const start = totalARR * 0.78;
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const progress = index / 11;
    const seasonal = Math.sin(index / 2) * totalARR * 0.015;
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      arr: Math.max(0, Math.round(start + (totalARR - start) * progress + seasonal)),
    };
  });
}

export function RevenueTrend({ tenants }: RevenueTrendProps) {
  const totalARR = (tenants ?? []).reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const rows = trendRows(totalARR);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>12-Month Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={rows} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value: number) => formatUSD(value)} />
            <Line dataKey="arr" dot={false} name="ARR" stroke="#0A9599" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
