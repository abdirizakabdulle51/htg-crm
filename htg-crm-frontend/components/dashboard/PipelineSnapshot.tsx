"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { PipelineOverview, PipelineStageBreakdown } from "@/types/crm";

type PipelineSnapshotProps = {
  pipeline?: PipelineOverview | null;
};

type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: PipelineStageBreakdown }>;
};

const COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#f59e0b", "#ef4444", "#64748b", "#14b8a6", "#84cc16"];

function PipelineTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const item = payload[0].payload;

  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-sm">
      <p className="font-medium">{item.name}</p>
      <p className="text-muted-foreground">
        {item.count} leads - {formatUSD(item.value)}
      </p>
    </div>
  );
}

export function PipelineSnapshot({ pipeline }: PipelineSnapshotProps) {
  const stages = pipeline?.by_stage ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Pipeline Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)]">
        {!pipeline ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-28 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        ) : stages.length ? (
          <div className="grid h-full grid-rows-[1fr_auto] gap-2">
            <div className="relative min-h-0">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={stages}
                    dataKey="value"
                    innerRadius="58%"
                    nameKey="name"
                    outerRadius="82%"
                    paddingAngle={2}
                  >
                    {stages.map((stage, index) => (
                      <Cell fill={COLORS[index % COLORS.length]} key={stage.stage} />
                    ))}
                  </Pie>
                  <Tooltip content={<PipelineTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatUSD(pipeline.total_value_usd)}</p>
                  <p className="text-xs text-muted-foreground">{pipeline.total_count} leads</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {stages.slice(0, 4).map((stage, index) => (
                <span className="flex items-center gap-1 text-muted-foreground" key={stage.stage}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {stage.name}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No active pipeline</div>
        )}
      </CardContent>
    </Card>
  );
}
