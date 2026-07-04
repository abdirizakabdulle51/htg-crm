"use client";

import { Activity, BriefcaseBusiness, Target, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { PipelineOverview, TeamTarget, Tenant } from "@/types/crm";

type CountrySummaryBarProps = {
  team?: TeamTarget[] | null;
  pipeline?: PipelineOverview | null;
  atRisk?: Tenant[] | null;
  tenants?: Tenant[] | null;
};

function currentQuarter() {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function countryFlag(country?: string) {
  const normalized = country?.toLowerCase() ?? "";
  if (normalized.includes("somalia")) return "🇸🇴";
  if (normalized.includes("kenya")) return "🇰🇪";
  if (normalized.includes("ethiopia")) return "🇪🇹";
  if (normalized.includes("djibouti")) return "🇩🇯";
  return "🌍";
}

function healthClass(health: "RED" | "YELLOW" | "GREEN") {
  if (health === "GREEN") return "bg-green-500 text-white";
  if (health === "YELLOW") return "bg-yellow-500 text-white";
  return "bg-red-500 text-white";
}

function aggregateHealth(team: TeamTarget[]): "RED" | "YELLOW" | "GREEN" {
  if (!team.length) return "YELLOW";
  const totalTarget = team.reduce((sum, member) => sum + (member.quarterly_target_usd ?? member.annual_target_usd / 4), 0);
  const achieved = team.reduce((sum, member) => sum + member.achieved_usd, 0);
  const pct = totalTarget > 0 ? (achieved / totalTarget) * 100 : 0;
  if (pct >= 95) return "GREEN";
  if (pct >= 80) return "YELLOW";
  return "RED";
}

export function CountrySummaryBar({ team, pipeline, tenants }: CountrySummaryBarProps) {
  const rows = team ?? [];
  const target = rows.reduce((sum, member) => sum + (member.quarterly_target_usd ?? member.annual_target_usd / 4), 0);
  const achieved = rows.reduce((sum, member) => sum + member.achieved_usd, 0);
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
  const countryName = pipeline?.by_country?.[0]?.country ?? "Country";
  const health = aggregateHealth(rows);

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>
              {countryFlag(countryName)}
            </span>
            <div>
              <p className="text-sm text-muted-foreground">HTG Clouds</p>
              <h1 className="text-xl font-semibold tracking-normal">{countryName} GM Dashboard</h1>
            </div>
            <Badge className={cn("ml-auto", healthClass(health))}>{health}</Badge>
          </div>
          <p className="text-2xl font-semibold tracking-normal">
            Q{currentQuarter()} Progress: {formatUSD(achieved)} achieved of {formatUSD(target)} target ({pct}%)
          </p>
        </div>

        <div className="grid min-w-[320px] grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md bg-muted p-3">
            <Users className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{rows.length}</p>
            <p className="text-xs text-muted-foreground">AMs</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <Activity className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{tenants?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Tenants</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <BriefcaseBusiness className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{formatUSD(pipeline?.total_value_usd ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Pipeline</p>
          </div>
          <div className="rounded-md bg-muted p-3">
            <Target className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="font-semibold">{formatUSD(pipeline?.won_this_month?.value ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Won this month</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
