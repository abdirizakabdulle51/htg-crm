"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { QuarterTarget } from "@/types/crm";

type QuarterProgressBarProps = {
  targets?: QuarterTarget[] | null;
};

type QuarterRow = {
  quarter: number;
  label: string;
  achieved: number;
  remaining: number;
  target: number;
  percent: number;
};

function progressColor(percent: number) {
  if (percent >= 100) return "bg-green-500";
  if (percent >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function achievedColor(percent: number) {
  if (percent >= 100) return "#22c55e";
  if (percent >= 80) return "#f59e0b";
  return "#ef4444";
}

function currentQuarter() {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

export function QuarterProgressBar({ targets }: QuarterProgressBarProps) {
  const activeQuarter = currentQuarter();
  const rows: QuarterRow[] = (targets ?? [])
    .slice()
    .sort((a, b) => a.quarter - b.quarter)
    .map((target) => {
      const achieved = target.achieved_usd ?? 0;
      const total = target.quarterly_target_usd || 0;
      const percent = total > 0 ? Math.min(100, (achieved / total) * 100) : 0;

      return {
        quarter: target.quarter,
        label: `Q${target.quarter}`,
        achieved,
        remaining: Math.max(total - achieved, 0),
        target: total,
        percent,
      };
    });

  if (!rows.length) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Quarter Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid h-[calc(100%-4.25rem)] grid-cols-[1fr_180px] gap-5">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((quarter) => (
              <div className="space-y-2" key={quarter}>
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const chartData = rows.map((row) => ({
    ...row,
    achievedFill: achievedColor(row.percent),
  }));

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>Quarter Progress</CardTitle>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4.25rem)] gap-5 md:grid-cols-[1fr_220px]">
        <div className="space-y-3 overflow-hidden">
          {rows.map((row) => (
            <div className="space-y-1.5" key={row.quarter}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">
                  {row.label}
                  {row.quarter === activeQuarter ? " (current)" : ""}
                </span>
                <span className="truncate text-muted-foreground">
                  {formatUSD(row.achieved)} achieved of {formatUSD(row.target)} target
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full", progressColor(row.percent))}
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden h-full min-h-0 md:block">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis hide type="number" />
              <YAxis axisLine={false} dataKey="label" tickLine={false} type="category" width={28} />
              <Bar dataKey="achieved" fill="#0f766e" radius={[4, 0, 0, 4]} stackId="target" />
              <Bar dataKey="remaining" fill="#e5e7eb" radius={[0, 4, 4, 0]} stackId="target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
