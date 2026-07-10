"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense, type ReactNode } from "react";
import useSWR from "swr";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { ForecastResponse, PipelineOverview, TeamTargetsResponse, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const MONTHLY_REVENUE = [
  { month: "Apr 2026", revenue: 405000 },
  { month: "May 2026", revenue: 428000 },
  { month: "Jun 2026", revenue: 450000 },
  { month: "Jul 2026", revenue: 472000 },
  { month: "Aug 2026", revenue: 489000 },
  { month: "Sep 2026", revenue: 497000 },
];

const SECTOR_COLORS = ["#2563eb", "#14b8a6", "#7c3aed", "#f59e0b", "#ef4444", "#64748b"];

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type TargetsApiResponse = {
  targets?: Array<{
    country?: string | null;
    account_manager_id?: string | null;
    target_arr_usd: number;
  }>;
};

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function healthStatus(tenant: Tenant) {
  if (tenant.health) return tenant.health;
  if ((tenant.risk_score ?? 0) >= 80) return "HIGH RISK";
  if ((tenant.risk_score ?? 0) >= 60 || tenant.status === "AT_RISK") return "AT RISK";
  return "HEALTHY";
}

function healthVariant(status: string) {
  if (status === "HEALTHY" || status === "GREEN") return "bg-green-500 text-white";
  if (status === "AT RISK" || status === "YELLOW") return "bg-amber-500 text-white";
  return "bg-red-500 text-white";
}

function cardHighlight(active: boolean) {
  return active ? "border-teal-300 shadow-md ring-1 ring-teal-100" : "";
}

function ContextBanner({
  title,
  children,
  href,
}: {
  title: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-teal-800">{children}</p>
      </div>
      <Link className="shrink-0 font-medium text-teal-700 underline-offset-4 hover:underline" href={href}>
        Clear view
      </Link>
    </div>
  );
}

export default function RevenuePage() {
  return (
    <Suspense fallback={<div className="space-y-5" />}>
      <RevenueContent />
    </Suspense>
  );
}

function RevenueContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { data: session, status } = useSession();
  const token = typeof session?.accessToken === "string" ? session.accessToken : "";

  const authedFetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(`${API}${url}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await response.json();
    if (!response.ok) {
      const envelope = body as ApiEnvelope<T>;
      throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
    }
    if (body && typeof body === "object" && "data" in body && "error" in body) {
      return (body as ApiEnvelope<T>).data as T;
    }
    return body as T;
  };

  const canFetch = status === "authenticated" && Boolean(token);
  const { data: tenants } = useSWR<Tenant[]>(canFetch ? "/api/v1/tenants?limit=100" : null, authedFetcher, {
    refreshInterval: 120000,
  });
  const { data: targets } = useSWR<TargetsApiResponse>(
    canFetch ? "/api/v1/targets?quarter=3&year=2026" : null,
    authedFetcher,
    { refreshInterval: 120000 },
  );
  const { data: teamHealth } = useSWR<TeamTargetsResponse>(canFetch ? "/api/v1/targets/team" : null, authedFetcher, {
    refreshInterval: 120000,
  });
  const { data: pipeline } = useSWR<PipelineOverview>(canFetch ? "/api/v1/pipeline" : null, authedFetcher, {
    refreshInterval: 60000,
  });
  const { data: forecast } = useSWR<ForecastResponse>(canFetch ? "/api/v1/ai/forecast?scope=year" : null, authedFetcher, {
    refreshInterval: 180000,
  });

  const totalARR = (tenants ?? []).reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const q3Target = (targets?.targets ?? [])
    .filter((target) => !target.account_manager_id)
    .reduce((sum, target) => sum + (target.target_arr_usd ?? 0), 0);
  const q3Achieved = (teamHealth?.team ?? []).reduce((sum, member) => sum + (member.achieved_usd ?? 0), 0);
  const forecastValue = forecast?.adjusted_forecast_usd ?? 0;
  const pipelineValue = pipeline?.total_value_usd ?? 0;
  const wonThisMonth = pipeline?.won_this_month?.value ?? q3Achieved;
  const wonCount = pipeline?.won_this_month?.count ?? 0;
  const sectorRows = Array.from(
    (tenants ?? []).reduce((totals, tenant) => {
      const sector = tenant.sector ?? tenant.sector_name ?? "Unassigned";
      totals.set(sector, (totals.get(sector) ?? 0) + tenantARR(tenant));
      return totals;
    }, new Map<string, number>()),
  )
    .map(([sector, arr]) => ({
      sector,
      arr,
      percentage: totalARR > 0 ? (arr / totalARR) * 100 : 0,
    }))
    .sort((a, b) => b.arr - a.arr);
  const topTenants = [...(tenants ?? [])].sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Revenue</h1>
        <p className="text-sm text-muted-foreground">ARR concentration, sector mix, and monthly revenue trend.</p>
      </div>

      {view === "arr" && (
        <ContextBanner href="/revenue" title="Viewing Total ARR breakdown">
          {formatUSD(totalARR)} total ARR across {(tenants ?? []).length.toLocaleString("en-US")} tenants. Sector and customer concentration are highlighted below.
        </ContextBanner>
      )}
      {view === "targets" && (
        <ContextBanner href="/revenue" title="Viewing Q3 target context">
          Current company Q3 target is <strong>{formatUSD(q3Target)}</strong>.
        </ContextBanner>
      )}
      {view === "achievement" && (
        <ContextBanner href="/revenue" title="Viewing Q3 achieved revenue">
          Current Q3 achieved revenue is <strong>{formatUSD(q3Achieved)}</strong>.
        </ContextBanner>
      )}
      {view === "forecast" && (
        <ContextBanner href="/revenue" title="Viewing Q3 forecast">
          Forecast is <strong>{formatUSD(forecastValue)}</strong> with {formatUSD(pipelineValue)} in total pipeline context.
        </ContextBanner>
      )}
      {view === "won" && (
        <ContextBanner href="/revenue" title="Viewing deals won this month">
          {wonCount > 0
            ? `${wonCount} won deals total ${formatUSD(wonThisMonth)} this month.`
            : "No detailed won opportunity rows are available on this page yet."}
        </ContextBanner>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={`h-[22rem] overflow-hidden ${cardHighlight(view === "achievement" || view === "forecast" || view === "won")}`}>
          <CardHeader className="pb-2">
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-4rem)]">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={MONTHLY_REVENUE} margin={{ bottom: 8, left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value: number) => formatUSD(value)} />
                <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className={`h-[22rem] overflow-hidden ${cardHighlight(view === "arr")}`}>
          <CardHeader className="pb-2">
            <CardTitle>Revenue by Sector</CardTitle>
          </CardHeader>
          <CardContent className="grid h-[calc(100%-4rem)] grid-cols-1 gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={sectorRows} dataKey="arr" innerRadius={44} outerRadius={72} paddingAngle={2}>
                  {sectorRows.map((row, index) => (
                    <Cell fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} key={row.sector} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatUSD(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 overflow-auto pr-1">
              {sectorRows.map((row, index) => (
                <div className="space-y-1" key={row.sector}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
                      />
                      <span className="truncate font-medium">{row.sector}</span>
                    </div>
                    <span className="text-muted-foreground">{row.percentage.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{formatUSD(row.arr)} ARR</p>
                </div>
              ))}
              {!sectorRows.length && <p className="text-sm text-muted-foreground">No sector revenue data yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cardHighlight(view === "arr")}>
        <CardHeader>
          <CardTitle>Top 5 Tenants by ARR</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 text-right font-medium">Health Status</th>
                </tr>
              </thead>
              <tbody>
                {topTenants.map((tenant) => {
                  const health = healthStatus(tenant);
                  return (
                    <tr className="border-b last:border-0" key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.country ?? "Unassigned"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.sector ?? tenant.sector_name ?? "Unassigned"}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3 text-right">
                        <Badge className={healthVariant(health)}>{health}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!topTenants.length && <p className="py-6 text-sm text-muted-foreground">No tenant revenue data yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
