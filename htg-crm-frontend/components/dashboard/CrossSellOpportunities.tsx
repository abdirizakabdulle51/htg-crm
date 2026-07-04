"use client";

import Link from "next/link";
import { Database, Eye, HardDrive, Server, ServerCog, ShieldCheck, Siren, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatUSD } from "@/lib/utils";
import type { AIRecommendation } from "@/types/crm";

type CrossSellOpportunitiesProps = {
  recommendations?: AIRecommendation[] | null;
  onDismissed?: () => void;
};

const serviceIcons = {
  BACKUP: HardDrive,
  DISASTER_RECOVERY: Siren,
  MANAGED_SERVICE: ServerCog,
  SECURITY: ShieldCheck,
  MONITORING: Eye,
  DATABASE: Database,
  VM: Server,
};

function serviceLabel(service?: string) {
  return service?.replaceAll("_", " ") ?? "Cloud service";
}

function iconFor(service?: string) {
  return serviceIcons[service as keyof typeof serviceIcons] ?? Server;
}

export function CrossSellOpportunities({ recommendations, onDismissed }: CrossSellOpportunitiesProps) {
  async function dismiss(id: string) {
    await apiFetch(`/api/v1/ai/recommendations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "dismissed" }),
    });
    onDismissed?.();
  }

  const rows = recommendations?.slice(0, 3) ?? [];

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Cross-Sell Opportunities</CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-hidden">
        {!recommendations ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div className="h-14 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map((recommendation) => {
              const Icon = iconFor(recommendation.recommended_service);

              return (
                <div className="rounded-md border p-2" key={recommendation.id}>
                  <div className="flex gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{recommendation.tenant_name ?? "Tenant"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {serviceLabel(recommendation.recommended_service)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-green-600">
                          +{formatUSD(recommendation.estimated_monthly_value_usd ?? 0)}/mo
                        </p>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{recommendation.message}</p>
                      <div className="mt-2 flex gap-2">
                        <Button asChild className="h-7 px-2" size="sm" variant="outline">
                          <Link href={`/tenants/${recommendation.tenant_id ?? ""}`}>View</Link>
                        </Button>
                        <Button
                          className="h-7 px-2"
                          onClick={() => dismiss(recommendation.id)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <X className="mr-1 h-3 w-3" />
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            No new recommendations
          </div>
        )}
      </CardContent>
    </Card>
  );
}
