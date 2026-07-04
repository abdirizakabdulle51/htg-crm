import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AIInsightBadge() {
  return (
    <Badge variant="secondary">
      <Sparkles className="mr-1 h-3 w-3" />
      AI insight
    </Badge>
  );
}
