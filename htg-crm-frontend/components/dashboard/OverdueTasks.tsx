import Link from "next/link";
import { FileText, Mail, MessageSquare, Phone, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { OverdueActivity } from "@/types/crm";

type OverdueTasksProps = {
  activities?: OverdueActivity[] | null;
};

const typeIcons = {
  CALL: Phone,
  MEETING: Users,
  EMAIL: Mail,
  NOTE: MessageSquare,
  PROPOSAL: FileText,
};

function badgeClass(days: number) {
  if (days > 7) return "bg-red-500 text-white";
  if (days >= 3) return "bg-amber-500 text-white";
  return "bg-yellow-500 text-white";
}

function hrefFor(activity: OverdueActivity) {
  if (activity.entity_type === "tenant") return `/tenants/${activity.entity_id}`;
  if (activity.entity_type === "lead") return `/leads/${activity.entity_id}`;
  return `/activities/${activity.id}`;
}

export function OverdueTasks({ activities }: OverdueTasksProps) {
  const rows = activities?.slice(0, 6) ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Overdue Tasks</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
        {!activities ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-14 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map((activity) => {
              const Icon = typeIcons[activity.type as keyof typeof typeIcons] ?? MessageSquare;

              return (
                <div className="flex items-start gap-3 rounded-md border p-3" key={activity.id}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{activity.subject}</p>
                      <Badge className={cn("shrink-0", badgeClass(activity.days_overdue))}>
                        {activity.days_overdue}d
                      </Badge>
                    </div>
                    <Link className="mt-1 block truncate text-xs text-blue-700 hover:underline" href={hrefFor(activity)}>
                      {activity.entity_name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(activity.next_action_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No overdue tasks
          </div>
        )}
      </CardContent>
    </Card>
  );
}
