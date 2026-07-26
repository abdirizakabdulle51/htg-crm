"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantARR, tenantRiskScore } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { TeamTarget, Tenant } from "@/types/crm";

type ChurnRiskSummaryProps = {
  tenants?: Tenant[] | null;
  team?: TeamTarget[] | null;
};

const COLORS = {
  High: "#ef4444",
  Medium: "#f97316",
  Monitored: "#f59e0b",
};

function riskClass(score: number) {
  if (score > 80) return "bg-red-500 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  return "bg-amber-500 text-white";
}

export function ChurnRiskSummary({ tenants, team }: ChurnRiskSummaryProps) {
  const rows = tenants ?? [];
  const teamMap = new Map((team ?? []).map((member) => [member.user_id, member.name]));
  const totalARR = rows.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const distribution = [
    { name: "High", value: rows.filter((tenant) => tenantRiskScore(tenant) > 80).length },
    { name: "Medium", value: rows.filter((tenant) => tenantRiskScore(tenant) >= 60 && tenantRiskScore(tenant) <= 80).length },
    { name: "Monitored", value: rows.filter((tenant) => tenantRiskScore(tenant) >= 40 && tenantRiskScore(tenant) < 60).length },
  ].filter((item) => item.value > 0);
  const top = rows.slice().sort((a, b) => tenantRiskScore(b) - tenantRiskScore(a)).slice(0, 5);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Churn Risk</CardTitle>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4rem)] grid-rows-[auto_1fr] gap-3">
        <div className="flex items-center justify-between rounded-md bg-red-50 p-3">
          <div>
            <p className="text-xs text-red-700">Total ARR at risk</p>
            <p className="text-xl font-semibold text-red-900">{formatUSD(totalARR)}</p>
          </div>
          <div className="h-20 w-20">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" innerRadius="55%" outerRadius="90%" paddingAngle={2}>
                  {distribution.map((entry) => (
                    <Cell fill={COLORS[entry.name as keyof typeof COLORS]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {!tenants ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div className="h-9 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : top.length ? (
          <div className="space-y-2 overflow-auto pr-1">
            {top.map((tenant) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-md border p-2 transition hover:bg-muted"
                href={`/tenants/${tenant.id}`}
                key={tenant.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {tenant.account_manager_name ?? teamMap.get(tenant.account_manager_id ?? "") ?? "AM pending"}
                  </p>
                </div>
                <Badge className={cn("shrink-0", riskClass(tenantRiskScore(tenant)))}>{tenantRiskScore(tenant).toFixed(0)}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No churn risk above threshold
          </div>
        )}
      </CardContent>
    </Card>
  );
}
