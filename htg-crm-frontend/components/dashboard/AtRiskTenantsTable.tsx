import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type AtRiskTenantsTableProps = {
  tenants?: Tenant[] | null;
};

function riskClass(score: number) {
  if (score >= 80) return "bg-red-500 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  return "bg-amber-500 text-white";
}

export function AtRiskTenantsTable({ tenants }: AtRiskTenantsTableProps) {
  const rows = tenants?.slice(0, 6) ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>At-Risk Tenants</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-auto">
        {!tenants ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-9 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Tenant</th>
                <th className="py-2 text-left font-medium">Sector</th>
                <th className="py-2 text-right font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tenant) => (
                <tr className="border-b last:border-0" key={tenant.id}>
                  <td className="py-2">
                    <Link className="font-medium hover:underline" href={`/tenants/${tenant.id}`}>
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="py-2 text-muted-foreground">{tenant.sector_name ?? tenant.sector ?? "Pending"}</td>
                  <td className="py-2 text-right">
                    <Badge className={cn(riskClass(tenant.risk_score ?? 0))}>{tenant.risk_score ?? 0}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No at-risk tenants</div>
        )}
      </CardContent>
    </Card>
  );
}
