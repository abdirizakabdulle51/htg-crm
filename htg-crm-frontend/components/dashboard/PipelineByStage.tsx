"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { PipelineOverview } from "@/types/crm";

type PipelineByStageProps = {
  pipeline?: PipelineOverview | null;
};

const stageOrder = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

function stageName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("won")) return "Won";
  if (lower.includes("lost")) return "Lost";
  if (lower.includes("negotiation")) return "Negotiation";
  if (lower.includes("proposal")) return "Proposal";
  if (lower.includes("qualified")) return "Qualified";
  return "Prospect";
}

export function PipelineByStage({ pipeline }: PipelineByStageProps) {
  const byStage = pipeline?.by_stage ?? [];
  const rows = stageOrder.map((stage) => {
    const matches = byStage.filter((item) => stageName(item.name) === stage);
    return {
      stage,
      count: matches.reduce((sum, item) => sum + item.count, 0),
      value: matches.reduce((sum, item) => sum + item.value, 0),
    };
  });

  if (!byStage.length) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Pipeline by Stage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-md border p-4 md:col-span-3 xl:col-span-6">
            <p className="text-sm text-muted-foreground">Stage breakdown unavailable. Current pipeline value remains {formatUSD(pipeline?.total_value_usd ?? 0)}.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {rows.map((row) => (
          <div className="rounded-md border p-4" key={row.stage}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{row.stage}</p>
            <p className="mt-2 text-2xl font-semibold">{row.count}</p>
            <p className="mt-1 text-sm text-[#0A9599]">{formatUSD(row.value)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
