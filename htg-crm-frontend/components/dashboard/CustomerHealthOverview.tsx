"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tenant } from "@/types/crm";

type CustomerHealthOverviewProps = {
  tenants?: Tenant[] | null;
};

function healthScore(tenant: Tenant) {
  const value = (tenant as Tenant & { health_score?: number }).health_score;
  return typeof value === "number" ? value : 0;
}

export function CustomerHealthOverview({ tenants }: CustomerHealthOverviewProps) {
  const rows = tenants ?? [];
  const healthy = rows.filter((tenant) => healthScore(tenant) > 0.8).length;
  const warning = rows.filter((tenant) => healthScore(tenant) >= 0.6 && healthScore(tenant) <= 0.8).length;
  const critical = rows.filter((tenant) => healthScore(tenant) < 0.6).length;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle>Customer Health Overview</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <HealthCount label="Healthy" value={healthy} className="border-emerald-200 bg-emerald-50 text-emerald-900" />
        <HealthCount label="Warning" value={warning} className="border-amber-200 bg-amber-50 text-amber-900" />
        <HealthCount label="Critical" value={critical} className="border-red-200 bg-red-50 text-red-900" />
      </CardContent>
    </Card>
  );
}

function HealthCount({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-md border p-4 ${className}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
