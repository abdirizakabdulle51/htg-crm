import { Lightbulb, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AICoachResponse } from "@/types/crm";

type AICoachCardProps = {
  coaching?: AICoachResponse | null;
};

export function AICoachCard({ coaching }: AICoachCardProps) {
  if (!coaching) {
    return (
      <Card className="overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
        <CardContent className="space-y-4 p-5">
          <div className="h-6 w-48 animate-pulse rounded bg-white/15" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-white/15" />
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div className="h-16 animate-pulse rounded-md bg-white/10" key={item} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-slate-800 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-blue-100">
              <Sparkles className="h-4 w-4" />
              AI Coach
            </div>
            <h2 className="text-2xl font-semibold tracking-normal">{coaching.greeting}</h2>
            <p className="mt-1 text-sm leading-5 text-blue-100">{coaching.health_summary}</p>
          </div>
          <Lightbulb className="h-6 w-6 shrink-0 text-teal-200" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {coaching.top_3_actions.slice(0, 3).map((action, index) => (
            <button
              className="rounded-md bg-gray-800/85 p-3 text-left text-sm leading-5 transition hover:bg-gray-700"
              key={`${action}-${index}`}
              type="button"
            >
              <span className="mb-1 block text-xs font-semibold text-teal-200">Action {index + 1}</span>
              {action}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {coaching.cross_sell_alerts.slice(0, 4).map((alert) => (
            <Badge className="bg-teal-500/20 text-teal-100" key={alert}>
              {alert}
            </Badge>
          ))}
          {coaching.renewal_warnings.slice(0, 4).map((warning) => (
            <Badge className="bg-amber-500/20 text-amber-100" key={warning}>
              {warning}
            </Badge>
          ))}
        </div>

        {coaching.sales_tip ? <p className="text-sm italic leading-5 text-gray-300">{coaching.sales_tip}</p> : null}
      </CardContent>
    </Card>
  );
}
