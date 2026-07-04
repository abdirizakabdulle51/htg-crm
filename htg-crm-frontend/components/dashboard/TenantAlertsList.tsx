import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type TenantAlertsListProps = {
  tenants?: Tenant[] | null;
};

function riskClass(score: number) {
  if (score >= 80) return "bg-red-500 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  return "bg-amber-500 text-white";
}

export function TenantAlertsList({ tenants }: TenantAlertsListProps) {
  const rows = tenants?.slice(0, 5) ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Tenant Alerts</CardTitle>
        {tenants?.length ? (
          <Button asChild className="h-8 px-2" size="sm" variant="ghost">
            <Link href="/tenants/at-risk">View all</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
        {!tenants ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div className="h-10 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map((tenant) => (
              <Link
                className="flex items-center justify-between gap-3 rounded-md p-2 transition hover:bg-muted"
                href={`/tenants/${tenant.id}`}
                key={tenant.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <Badge className="mt-1 max-w-full truncate" variant="secondary">
                    {tenant.sector_name ?? tenant.sector ?? "Sector pending"}
                  </Badge>
                </div>
                <Badge className={cn("shrink-0", riskClass(tenant.risk_score ?? 0))}>{tenant.risk_score ?? 0}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            No at-risk tenants
          </div>
        )}
      </CardContent>
    </Card>
  );
}
