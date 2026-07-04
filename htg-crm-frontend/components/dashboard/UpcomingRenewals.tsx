import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatUSD } from "@/lib/utils";
import type { Contract } from "@/types/crm";

type UpcomingRenewalsProps = {
  contracts?: Contract[] | null;
};

function daysUntil(endDate: string, provided?: number) {
  if (typeof provided === "number") return provided;
  const today = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function UpcomingRenewals({ contracts }: UpcomingRenewalsProps) {
  const rows = contracts?.slice(0, 5) ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Upcoming Renewals</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
        {!contracts ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-14 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((contract) => {
              const days = daysUntil(contract.end_date, contract.days_to_expiry);

              return (
                <Link
                  className="flex items-center justify-between gap-3 rounded-md border p-3 transition hover:bg-muted"
                  href={`/tenants/${contract.tenant_id}`}
                  key={contract.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{contract.contract_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(contract.end_date)}</p>
                    <p className="text-xs font-medium">{formatUSD(contract.value_usd)}</p>
                  </div>
                  <Badge className="shrink-0 bg-amber-500 text-white">{days}d</Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            No renewals in the next 30 days
          </div>
        )}
      </CardContent>
    </Card>
  );
}
