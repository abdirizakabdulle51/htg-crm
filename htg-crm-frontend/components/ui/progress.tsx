import * as React from "react";

import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
      <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
