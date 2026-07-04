import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatUSD } from "@/lib/utils";
import type { TargetHealth } from "@/types/crm";

type TargetHealthCardProps = {
  health?: TargetHealth | null;
};

function healthStyles(health?: TargetHealth["health"]) {
  switch (health) {
    case "GREEN":
      return {
        circle: "bg-green-100 text-green-800",
        chip: "bg-green-500 text-white",
      };
    case "YELLOW":
      return {
        circle: "bg-yellow-100 text-yellow-800",
        chip: "bg-yellow-500 text-white",
      };
    case "RED":
    default:
      return {
        circle: "bg-red-100 text-red-800",
        chip: "bg-red-500 text-white",
      };
  }
}

function formatGap(value: number) {
  const absolute = formatUSD(Math.abs(value));
  return value >= 0 ? `+${absolute}` : `-${absolute}`;
}

export function TargetHealthCard({ health }: TargetHealthCardProps) {
  if (!health) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle>Target Health</CardTitle>
          <div className="h-6 w-16 animate-pulse rounded-md bg-muted" />
        </CardHeader>
        <CardContent className="flex h-[calc(100%-4.5rem)] items-center gap-5">
          <div className="h-28 w-28 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="w-full space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const styles = healthStyles(health.health);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle>Target Health</CardTitle>
        <Badge className={styles.chip}>{health.health}</Badge>
      </CardHeader>
      <CardContent className="flex h-[calc(100%-4.5rem)] items-center gap-5">
        <div className={cn("flex h-28 w-28 shrink-0 items-center justify-center rounded-full", styles.circle)}>
          <span className="px-2 text-center text-2xl font-bold leading-tight">{formatGap(health.gap_usd)}</span>
        </div>
        <div className="min-w-0 space-y-3">
          <p className="text-sm font-medium">
            Required: {formatUSD(health.required_daily_pace_usd)}/day | {health.working_days_remaining} days left
          </p>
          <p className="line-clamp-3 text-sm leading-5 text-muted-foreground">{health.ai_advice}</p>
        </div>
      </CardContent>
    </Card>
  );
}
