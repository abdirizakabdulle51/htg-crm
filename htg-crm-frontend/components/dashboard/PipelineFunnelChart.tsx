"use client";

import { useMemo, useState } from "react";
import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { PipelineSectorBreakdown, PipelineStageBreakdown } from "@/types/crm";

type PipelineFunnelChartProps = {
  stages?: PipelineStageBreakdown[] | null;
  sectors?: PipelineSectorBreakdown[] | null;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: PipelineStageBreakdown & { avg_deal_size: number } }>;
};

function FunnelTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">
        {item.count} leads - {formatUSD(item.value)}
      </p>
      <p className="text-muted-foreground">Avg deal {formatUSD(item.avg_deal_size)}</p>
    </div>
  );
}

export function PipelineFunnelChart({ stages, sectors }: PipelineFunnelChartProps) {
  const [sector, setSector] = useState("All sectors");
  const rows = useMemo(
    () =>
      (stages ?? []).map((stage) => ({
        ...stage,
        avg_deal_size: stage.count > 0 ? stage.value / stage.count : 0,
        fill: stage.stage >= 9 ? "#22c55e" : stage.stage >= 5 ? "#2563eb" : "#0f766e",
      })),
    [stages],
  );

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Pipeline Funnel</CardTitle>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          onChange={(event) => setSector(event.target.value)}
          value={sector}
        >
          <option>All sectors</option>
          {(sectors ?? []).map((item) => (
            <option key={item.sector_id}>{item.sector}</option>
          ))}
        </select>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        {rows.length ? (
          <ResponsiveContainer height="100%" width="100%">
            <FunnelChart>
              <Tooltip content={<FunnelTooltip />} />
              <Funnel data={rows} dataKey="count" isAnimationActive nameKey="name">
                <LabelList dataKey="name" fill="#fff" fontSize={12} position="center" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No pipeline data</div>
        )}
        <Button className="sr-only" type="button">
          Filter: {sector}
        </Button>
      </CardContent>
    </Card>
  );
}
