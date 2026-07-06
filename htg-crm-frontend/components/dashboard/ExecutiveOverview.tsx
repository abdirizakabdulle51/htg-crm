"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { AlertTriangle, Brain, Globe2, Target, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { AIRecommendation, PipelineOverview, RecommendationsResponse, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

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

function tenantMonthlyRevenue(tenant: Tenant) {
  return tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? (tenant.arr_usd ?? tenant.arrUsd ?? 0) / 12;
}

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? tenantMonthlyRevenue(tenant) * 12;
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function countryRevenue(tenants?: Tenant[] | null, pipeline?: PipelineOverview | null) {
  const countryNameByID = new Map((pipeline?.by_country ?? []).map((country) => [country.country_id, country.country]));
  const totals = new Map<string, number>();
  for (const tenant of tenants ?? []) {
    const country = tenant.country ?? (tenant.country_id ? countryNameByID.get(tenant.country_id) : undefined) ?? "Unassigned";
    totals.set(country, (totals.get(country) ?? 0) + tenantARR(tenant));
  }
  return Array.from(totals.entries())
    .map(([country, arr]) => ({ country, arr }))
    .sort((a, b) => b.arr - a.arr);
}

function insightText(item: AIRecommendation) {
  return item.message || item.title;
}

export function ExecutiveOverview() {
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
      console.error("executive overview fetch failed", url, response.status, envelope.error ?? body);
      throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
    }
    if (body && typeof body === "object" && "data" in body && "error" in body) {
      return (body as ApiEnvelope<T>).data as T;
    }
    return body as T;
  };

  const canFetch = status === "authenticated" && Boolean(token);
  const { data: pipeline } = useSWR<PipelineOverview>(canFetch ? "/api/v1/pipeline" : null, authedFetcher, {
    refreshInterval: 60000,
  });
  const { data: tenants } = useSWR<Tenant[]>(canFetch ? "/api/v1/tenants?limit=100" : null, authedFetcher, {
    refreshInterval: 120000,
  });
  const { data: targets } = useSWR<TargetsApiResponse>(
    canFetch ? "/api/v1/targets?quarter=3&year=2026" : null,
    authedFetcher,
    { refreshInterval: 120000 },
  );
  const { data: recommendations } = useSWR<RecommendationsResponse>(
    canFetch ? "/api/v1/ai/recommendations?type=CROSS_SELL&limit=3" : null,
    authedFetcher,
    { refreshInterval: 180000 },
  );

  const targetRows = (targets?.targets ?? []).filter((target) => !target.account_manager_id);
  const q3Target = targetRows.reduce((sum, target) => sum + target.target_arr_usd, 0);
  const q3Achieved = pipeline?.won_this_month?.value ?? 0;
  const q3Attainment = q3Target > 0 ? (q3Achieved / q3Target) * 100 : 0;
  const totalARR = (tenants ?? []).reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const countries = countryRevenue(tenants, pipeline);
  const topCountry = countries[0];
  const worstCountry = countries[countries.length - 1];
  const averageCountryARR = countries.length ? totalARR / countries.length : 0;
  const revenueGrowth = averageCountryARR > 0 && topCountry ? ((topCountry.arr - averageCountryARR) / averageCountryARR) * 100 : 0;
  const insights = recommendations?.recommendations?.slice(0, 3) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Executive Overview</h1>
        <p className="text-sm text-muted-foreground">Company performance snapshot for Q3 2026.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total ARR" value={formatUSD(totalARR)} />
        <MetricCard
          label="Q3 Target vs Achieved"
          value={`${formatUSD(q3Achieved)} / ${formatUSD(q3Target)}`}
          detail={`${q3Attainment.toFixed(1)}% achieved`}
        />
        <MetricCard
          label="Revenue Growth"
          value={percent(revenueGrowth)}
          detail="Top country vs country average ARR"
          icon={revenueGrowth >= 0 ? TrendingUp : TrendingDown}
        />
        <MetricCard
          label="Pipeline Summary"
          value={formatUSD(pipeline?.total_value_usd ?? 0)}
          detail={`${pipeline?.total_count ?? 0} open and closed leads`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top Performing Country</CardTitle>
            <Globe2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{topCountry?.country ?? "No country data"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatUSD(topCountry?.arr ?? 0)} ARR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Worst Performing Country</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{worstCountry?.country ?? "No country data"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{formatUSD(worstCountry?.arr ?? 0)} ARR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Won This Month</CardTitle>
            <Target className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatUSD(pipeline?.won_this_month?.value ?? 0)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{pipeline?.won_this_month?.count ?? 0} won deals</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Country</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(pipeline?.by_country ?? []).map((country) => (
              <div className="space-y-1" key={country.country_id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{country.country}</span>
                  <span className="text-muted-foreground">
                    {formatUSD(country.value)} - {country.count} leads
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-600"
                    style={{
                      width: `${Math.min(100, ((country.value || 0) / Math.max(pipeline?.total_value_usd ?? 1, 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {!pipeline?.by_country?.length && <p className="text-sm text-muted-foreground">No pipeline data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Top 3 AI Insights</CardTitle>
            <Brain className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => (
              <div className="rounded-md border p-3" key={insight.id}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <Badge variant="secondary">{formatUSD(insight.estimated_monthly_value_usd ?? 0)}/mo</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{insightText(insight)}</p>
              </div>
            ))}
            {!insights.length && <p className="text-sm text-muted-foreground">No AI insights available yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon = TrendingUp,
}: {
  label: string;
  value: string;
  detail?: string;
  icon?: typeof TrendingUp;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}
