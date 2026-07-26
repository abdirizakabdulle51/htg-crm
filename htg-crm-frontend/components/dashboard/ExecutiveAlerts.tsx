"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAtRiskTenant, tenantARR } from "@/components/dashboard/executive-utils";
import { cn, formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

type ExecutiveAlertsProps = {
  tenants?: Tenant[] | null;
  countryTargets?: Record<string, number>;
};

type AlertTone = "red" | "yellow" | "green";

type AlertItem = {
  tone: AlertTone;
  message: string;
  href: string;
};

const toneClasses: Record<AlertTone, string> = {
  red: "border-red-200 bg-red-50 text-red-900",
  yellow: "border-amber-200 bg-amber-50 text-amber-900",
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const dotClasses: Record<AlertTone, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
};

function daysUntil(date?: string) {
  if (!date) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const renewal = new Date(date);
  return Math.ceil((renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ExecutiveAlerts({ tenants, countryTargets }: ExecutiveAlertsProps) {
  const rows = tenants ?? [];
  const targets = countryTargets ?? {};
  const arrByCountry = rows.reduce<Record<string, number>>((acc, tenant) => {
    const country = tenant.country ?? "Unassigned";
    acc[country] = (acc[country] ?? 0) + tenantARR(tenant);
    return acc;
  }, {});
  const alerts: AlertItem[] = [];

  for (const [country, target] of Object.entries(targets)) {
    const current = arrByCountry[country] ?? 0;
    if (target <= 0) continue;
    const gapPercent = ((target - current) / target) * 100;
    if (gapPercent > 10) {
      alerts.push({
        tone: "red",
        href: `/country-performance?country=${encodeURIComponent(country)}`,
        message: `${country} ARR is ${gapPercent.toFixed(0)}% below Q3 target (${formatUSD(current)} of ${formatUSD(target)}).`,
      });
    } else if (current >= target) {
      alerts.push({
        tone: "green",
        href: `/country-performance?country=${encodeURIComponent(country)}`,
        message: `${country} has exceeded its Q3 target by ${formatUSD(current - target)}.`,
      });
    }
  }

  const upcomingRenewal = rows
    .filter((tenant) => daysUntil(tenant.renewal_date ?? tenant.renewalDate) >= 0 && daysUntil(tenant.renewal_date ?? tenant.renewalDate) <= 60)
    .sort((a, b) => daysUntil(a.renewal_date ?? a.renewalDate) - daysUntil(b.renewal_date ?? b.renewalDate))[0];
  if (upcomingRenewal) {
    alerts.push({
      tone: "yellow",
      href: `/strategic-risks?tenant=${encodeURIComponent(upcomingRenewal.name)}`,
      message: `${upcomingRenewal.name} renewal is due in ${daysUntil(upcomingRenewal.renewal_date ?? upcomingRenewal.renewalDate)} days.`,
    });
  }

  const atRiskCount = rows.filter(isAtRiskTenant).length;
  if (atRiskCount > 1) {
    alerts.push({
      tone: "yellow",
      href: "/strategic-risks?filter=at-risk",
      message: `${atRiskCount} tenants are currently above the risk threshold.`,
    });
  }

  if (alerts.length < 4 && rows.length) {
    const totalARR = rows.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
    alerts.push({
      tone: "green",
      href: "/revenue?view=arr",
      message: `Enterprise ARR base is stable at ${formatUSD(totalARR)} across ${rows.length} active accounts.`,
    });
  }

  const visibleAlerts = alerts.slice(0, 6);

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[#0A9599]" />
          Executive Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!tenants ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div className="h-14 animate-pulse rounded-md bg-muted" key={item} />
            ))}
          </div>
        ) : visibleAlerts.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {visibleAlerts.map((alert) => (
              <Link
                aria-label={`${alert.message} Open detail view`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:shadow-sm hover:ring-1 hover:ring-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2",
                  toneClasses[alert.tone],
                )}
                href={alert.href}
                key={alert.message}
                onKeyDown={(event) => {
                  if (event.key === " ") {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
              >
                <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", dotClasses[alert.tone])} />
                <p className="text-sm leading-5">{alert.message}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            No executive alerts requiring immediate attention.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
