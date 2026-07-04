import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { PipelineOverview } from "@/types/crm";

type PipelineHeatmapProps = {
  pipeline?: PipelineOverview | null;
};

function intensity(value: number, max: number) {
  if (max <= 0) return "bg-muted";
  const pct = value / max;
  if (pct > 0.75) return "bg-blue-700 text-white";
  if (pct > 0.45) return "bg-blue-500 text-white";
  if (pct > 0.2) return "bg-blue-200 text-blue-950";
  return "bg-blue-50 text-blue-950";
}

export function PipelineHeatmap({ pipeline }: PipelineHeatmapProps) {
  const countries = pipeline?.by_country ?? [];
  const sectors = pipeline?.by_sector ?? [];
  const maxCountry = Math.max(...countries.map((item) => item.value), 0);
  const maxSector = Math.max(...sectors.map((item) => item.value), 0);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Pipeline Heatmap</CardTitle>
      </CardHeader>
      <CardContent className="grid h-[calc(100%-4rem)] gap-3 md:grid-cols-2">
        <div className="min-h-0 overflow-auto">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Countries</p>
          <div className="grid gap-2">
            {countries.map((country) => (
              <div className={cn("rounded-md p-3", intensity(country.value, maxCountry))} key={country.country_id}>
                <p className="text-sm font-medium">{country.country}</p>
                <p className="text-xs opacity-80">{country.count} leads - {formatUSD(country.value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-0 overflow-auto">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sectors</p>
          <div className="grid grid-cols-2 gap-2">
            {sectors.map((sector) => (
              <div className={cn("rounded-md p-3", intensity(sector.value, maxSector))} key={sector.sector_id}>
                <p className="truncate text-sm font-medium">{sector.sector}</p>
                <p className="text-xs opacity-80">{formatUSD(sector.value)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
