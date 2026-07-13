"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";

export type StrategicOpportunity = {
  name: string;
  value: number;
  country: string;
};

type StrategicOpportunitiesProps = {
  opportunities?: StrategicOpportunity[] | null;
};

export function StrategicOpportunities({ opportunities }: StrategicOpportunitiesProps) {
  const rows = (opportunities ?? [])
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Strategic Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {rows.map((item) => (
              <div className="rounded-md border p-4" key={`${item.country}-${item.name}`}>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.country}</p>
                <p className="mt-4 text-xl font-semibold text-[#0A9599]">{formatUSD(item.value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">No open strategic opportunities available yet.</div>
        )}
      </CardContent>
    </Card>
  );
}
