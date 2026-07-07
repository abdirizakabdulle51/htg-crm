"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tenantARR } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type StrategicAccountsProps = {
  tenants?: Tenant[] | null;
};

function healthScore(tenant: Tenant) {
  const value = (tenant as Tenant & { health_score?: number }).health_score;
  return typeof value === "number" ? value : 0;
}

function healthClass(score: number) {
  if (score > 0.8) return "bg-emerald-500 text-white";
  if (score >= 0.6) return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

function riskClass(score: number) {
  if (score >= 70) return "bg-red-100 text-red-700";
  if (score >= 50) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function StrategicAccounts({ tenants }: StrategicAccountsProps) {
  const rows = (tenants ?? []).slice().sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 5);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Strategic Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        {!tenants ? (
          <div className="grid gap-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div className="h-16 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="grid gap-2">
            {rows.map((tenant) => {
              const score = healthScore(tenant);
              const risk = tenant.risk_score ?? 0;
              return (
                <div className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_120px_120px_120px]" key={tenant.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tenant.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{tenant.country ?? "Country pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ARR</p>
                    <p className="text-sm font-semibold">{formatUSD(tenantARR(tenant))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Health</p>
                    <Badge className={cn("mt-1", healthClass(score))}>{Math.round(score * 100)}%</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Risk</p>
                    <Badge className={cn("mt-1", riskClass(risk))}>{risk}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">No strategic accounts available</div>
        )}
      </CardContent>
    </Card>
  );
}
