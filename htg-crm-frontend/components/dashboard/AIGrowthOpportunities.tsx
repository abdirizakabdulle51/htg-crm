import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { AIRecommendation } from "@/types/crm";

type AIGrowthOpportunitiesProps = {
  recommendations?: AIRecommendation[] | null;
};

function serviceLabel(service?: string) {
  return service?.replaceAll("_", " ") ?? "Cloud service";
}

export function AIGrowthOpportunities({ recommendations }: AIGrowthOpportunitiesProps) {
  const rows = recommendations?.slice(0, 5) ?? [];
  const total = (recommendations ?? []).reduce((sum, item) => sum + (item.estimated_monthly_value_usd ?? 0), 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>AI Growth</CardTitle>
        <Button asChild className="h-8 px-2" size="sm" variant="ghost">
          <Link href="/ai/recommendations">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4rem)] grid-rows-[auto_1fr] gap-3">
        <div className="rounded-md bg-teal-50 p-3">
          <p className="text-xs text-teal-700">Total cross-sell opportunity</p>
          <p className="text-xl font-semibold text-teal-900">{formatUSD(total)}/month</p>
        </div>
        {!recommendations ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div className="h-10 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="space-y-2 overflow-auto pr-1">
            {rows.map((item) => (
              <div className="rounded-md border p-2" key={item.id}>
                <p className="truncate text-sm font-medium">{item.tenant_name ?? "Tenant"}</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-muted-foreground">{serviceLabel(item.recommended_service)}</span>
                  <span className="font-semibold text-green-600">{formatUSD(item.estimated_monthly_value_usd ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No new cross-sell recommendations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
