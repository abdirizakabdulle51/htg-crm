"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { PipelineSectorBreakdown } from "@/types/crm";

type SectorBreakdownChartProps = {
  sectors?: PipelineSectorBreakdown[] | null;
  selectedSector?: string | null;
  onSelectSector?: (sectorID: string, sectorName: string) => void;
};

export function SectorBreakdownChart({ sectors, selectedSector, onSelectSector }: SectorBreakdownChartProps) {
  const rows = (sectors ?? []).map((sector) => ({
    ...sector,
    tenant_revenue_usd: sector.tenant_revenue_usd ?? 0,
  }));

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Sector Breakdown</CardTitle>
        {selectedSector ? <span className="text-xs text-muted-foreground">{selectedSector}</span> : null}
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        {rows.length ? (
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={rows} margin={{ bottom: 8, left: 0, right: 0, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="sector" fontSize={11} interval={0} tickLine={false} />
              <YAxis fontSize={11} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} yAxisId="left" />
              <YAxis hide orientation="right" yAxisId="right" />
              <Tooltip formatter={(value: number) => formatUSD(value)} />
              <Bar
                dataKey="value"
                fill="#2563eb"
                name="Pipeline value"
                onClick={(data) => onSelectSector?.(data.sector_id, data.sector)}
                radius={[4, 4, 0, 0]}
                yAxisId="left"
              />
              <Line
                dataKey="tenant_revenue_usd"
                dot={{ r: 3 }}
                name="Tenant revenue"
                stroke="#0f766e"
                strokeWidth={2}
                type="monotone"
                yAxisId="right"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No sector data</div>
        )}
      </CardContent>
    </Card>
  );
}
