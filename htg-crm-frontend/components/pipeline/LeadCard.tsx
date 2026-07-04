import type { Lead } from "@/types/crm";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatPercent, formatUSD } from "@/lib/utils";

export function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <div>
          <p className="text-sm font-medium">{lead.companyName}</p>
          <p className="text-xs text-muted-foreground">{lead.contactName}</p>
        </div>
        <div className="flex justify-between text-xs">
          <span>{formatUSD(lead.valueUsd)}</span>
          <span className="text-muted-foreground">{formatPercent(lead.probability)}</span>
        </div>
        <p className="text-xs text-muted-foreground">{formatDate(lead.expectedCloseDate)}</p>
      </CardContent>
    </Card>
  );
}
