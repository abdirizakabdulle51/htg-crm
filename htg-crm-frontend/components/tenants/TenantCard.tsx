import type { Tenant } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatUSD } from "@/lib/utils";

export function TenantCard({ tenant }: { tenant: Tenant }) {
  const renewalDate = tenant.renewalDate ?? tenant.renewal_date;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{tenant.name}</p>
            <p className="text-sm text-muted-foreground">
              {tenant.country ?? "Country pending"} - {tenant.sector ?? tenant.sector_name ?? "Sector pending"}
            </p>
          </div>
          <Badge variant={tenant.health === "risk" ? "destructive" : "secondary"}>
            {tenant.health ?? tenant.status ?? "pending"}
          </Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span>{formatUSD(tenant.arrUsd ?? 0)}</span>
          <span className="text-muted-foreground">{renewalDate ? formatDate(renewalDate) : "No renewal date"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
