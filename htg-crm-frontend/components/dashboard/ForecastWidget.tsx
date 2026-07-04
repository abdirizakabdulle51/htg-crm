"use client";

import { useMemo } from "react";
import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { ForecastResponse } from "@/types/crm";

type ForecastWidgetProps = {
  forecast?: ForecastResponse | null;
  targetUsd?: number;
};

function confidenceClass(confidence?: string) {
  if (confidence === "HIGH") return "bg-green-500 text-white";
  if (confidence === "LOW") return "bg-red-500 text-white";
  return "bg-amber-500 text-white";
}

export function ForecastWidget({ forecast, targetUsd }: ForecastWidgetProps) {
  const updatedMinutes = useMemo(() => new Date().getMinutes(), []);
  const target = targetUsd ?? forecast?.target_usd ?? 0;
  const forecastVsTargetPct =
    forecast && target > 0 ? (forecast.adjusted_forecast_usd / target) * 100 : forecast?.forecast_vs_target_pct ?? 0;
  const pct = Math.max(0, Math.min(140, forecastVsTargetPct));
  const chartData = [{ name: "forecast", value: pct, fill: pct >= 100 ? "#22c55e" : pct >= 80 ? "#f59e0b" : "#ef4444" }];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Country Forecast</CardTitle>
        <Badge className={cn(confidenceClass(forecast?.confidence))}>{forecast?.confidence ?? "MEDIUM"}</Badge>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4rem)] grid-rows-[1fr_auto] gap-3">
        {!forecast ? (
          <div className="space-y-3">
            <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-muted" />
            <div className="h-3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <>
            <div className="grid min-h-0 grid-cols-[130px_1fr] gap-3">
              <div className="relative min-h-0">
                <ResponsiveContainer height="100%" width="100%">
                  <RadialBarChart data={chartData} endAngle={-270} innerRadius="70%" outerRadius="100%" startAngle={90}>
                    <RadialBar background={{ fill: "#e5e7eb" }} cornerRadius={8} dataKey="value" />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold">{Math.round(forecastVsTargetPct)}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{forecast.period}</p>
                <p className="text-xl font-semibold">{formatUSD(forecast.adjusted_forecast_usd)}</p>
                <p className="text-xs text-muted-foreground">Target {formatUSD(target)}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{forecast.narrative}</p>
              </div>
            </div>
            <div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {forecast.top_risks.slice(0, 3).map((risk) => (
                  <li className="line-clamp-1" key={risk}>
                    - {risk}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Updated {updatedMinutes} min ago</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
