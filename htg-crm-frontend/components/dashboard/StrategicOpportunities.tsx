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

const fallbackOpportunities: StrategicOpportunity[] = [
  { name: "Banking Expansion", value: 450000, country: "Kenya" },
  { name: "Government Cloud", value: 300000, country: "Ethiopia" },
  { name: "Telecom Backup", value: 220000, country: "Somalia" },
  { name: "Healthcare DR", value: 180000, country: "Djibouti" },
];

export function StrategicOpportunities({ opportunities }: StrategicOpportunitiesProps) {
  const rows = (opportunities?.length ? opportunities : fallbackOpportunities)
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Strategic Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((item) => (
            <div className="rounded-md border p-4" key={`${item.country}-${item.name}`}>
              <p className="text-sm font-semibold">{item.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.country}</p>
              <p className="mt-4 text-xl font-semibold text-[#0A9599]">{formatUSD(item.value)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
