"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Suspense } from "react";
import useSWR from "swr";
import { AlertTriangle, BarChart3, Building2, Target, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { PipelineOverview, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const COUNTRIES = [
  { code: "SO", name: "Somalia" },
  { code: "KE", name: "Kenya" },
  { code: "ET", name: "Ethiopia" },
  { code: "DJ", name: "Djibouti" },
] as const;

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

type LeadsApiResponse = {
  items?: Lead[];
  leads?: Lead[];
};

type Lead = {
  id: string;
  country_id: string;
  value_usd: number;
  stage_number?: number;
};

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function achievementPercent(achieved: number, target: number) {
  if (target <= 0) return "0.0%";
  return `${((achieved / target) * 100).toFixed(1)}%`;
}

export default function CountryPerformancePage() {
  return (
    <Suspense fallback={<div className="space-y-5" />}>
      <CountryPerformanceContent />
    </Suspense>
  );
}

function CountryPerformanceContent() {
  const searchParams = useSearchParams();
  const pipelineView = searchParams.get("view") === "pipeline";
  const selectedCountryParam = searchParams.get("country");
  const selectedCountry = COUNTRIES.find((country) => country.name.toLowerCase() === selectedCountryParam?.toLowerCase())?.name;
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
  const { data: wonLeads } = useSWR<LeadsApiResponse | Lead[]>(
    canFetch ? "/api/v1/leads?stage=9&limit=100" : null,
    authedFetcher,
    { refreshInterval: 120000 },
  );

  const countriesByID = new Map((pipeline?.by_country ?? []).map((country) => [country.country_id, country.country]));
  const countryIDsByName = new Map((pipeline?.by_country ?? []).map((country) => [country.country, country.country_id]));
  const pipelineByCountry = new Map((pipeline?.by_country ?? []).map((country) => [country.country, country.value]));
  const targetByCountry = new Map(
    (targets?.targets ?? [])
      .filter((target) => !target.account_manager_id && target.country)
      .map((target) => [target.country as string, target.target_arr_usd]),
  );
  const leads = Array.isArray(wonLeads) ? wonLeads : wonLeads?.items ?? wonLeads?.leads ?? [];

  const rows = COUNTRIES.map((country) => {
    const countryID = countryIDsByName.get(country.name);
    const countryTenants = (tenants ?? []).filter((tenant) => {
      const tenantCountry = tenant.country ?? (tenant.country_id ? countriesByID.get(tenant.country_id) : undefined);
      return tenantCountry === country.name;
    });
    const achieved = leads
      .filter((lead) => lead.country_id === countryID)
      .reduce((sum, lead) => sum + (lead.value_usd ?? 0), 0);
    const target = targetByCountry.get(country.name) ?? 0;
    const totalARR = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);

    return {
      ...country,
      totalARR,
      q3Target: target,
      achievement: achievementPercent(achieved, target),
      revenueGap: Math.max(target - achieved, 0),
      activeTenants: countryTenants.filter((tenant) => tenant.status === "ACTIVE").length,
      atRiskTenants: countryTenants.filter((tenant) => (tenant.risk_score ?? 0) >= 60 || tenant.status === "AT_RISK").length,
      pipelineValue: pipelineByCountry.get(country.name) ?? 0,
    };
  }).sort((a, b) => b.totalARR - a.totalARR);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Country Performance</h1>
        <p className="text-sm text-muted-foreground">Q3 2026 performance across Somalia, Kenya, Ethiopia, and Djibouti.</p>
      </div>

      {pipelineView && (
        <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Viewing country pipeline breakdown</p>
            <p className="mt-1 text-teal-800">Pipeline values are highlighted in each country card.</p>
          </div>
          <Link className="shrink-0 font-medium text-teal-700 underline-offset-4 hover:underline" href="/country-performance">
            Clear view
          </Link>
        </div>
      )}

      {selectedCountry && (
        <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Viewing {selectedCountry} performance</p>
            <p className="mt-1 text-teal-800">{selectedCountry} is highlighted while other country cards remain visible.</p>
          </div>
          <Link className="shrink-0 font-medium text-teal-700 underline-offset-4 hover:underline" href="/country-performance">
            Clear view
          </Link>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-4">
        {rows.map((country) => (
          <Card
            className={`overflow-hidden ${selectedCountry === country.name ? "border-teal-300 shadow-md ring-1 ring-teal-100" : ""}`}
            key={country.code}
          >
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{country.name}</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Metric label="Total ARR" value={formatUSD(country.totalARR)} icon={TrendingUp} />
              <Metric label="Q3 Target" value={formatUSD(country.q3Target)} icon={Target} />
              <Metric label="Achievement" value={country.achievement} detail="Q3 new deals won" icon={TrendingUp} />
              <Metric label="Revenue Gap" value={formatUSD(country.revenueGap)} icon={AlertTriangle} />
              <Metric label="Active Tenants" value={country.activeTenants.toLocaleString("en-US")} icon={Building2} />
              <Metric label="At-Risk Tenants" value={country.atRiskTenants.toLocaleString("en-US")} icon={AlertTriangle} />
              <Metric label="Pipeline Value" value={formatUSD(country.pipelineValue)} icon={BarChart3} emphasized={pipelineView} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  emphasized,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  emphasized?: boolean;
  icon: typeof BarChart3;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${emphasized ? "rounded-md border border-teal-200 bg-teal-50 p-3" : ""}`}>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-lg font-semibold ${emphasized ? "text-teal-700" : ""}`}>{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <Icon className={`h-4 w-4 shrink-0 ${emphasized ? "text-teal-600" : "text-muted-foreground"}`} />
    </div>
  );
}
