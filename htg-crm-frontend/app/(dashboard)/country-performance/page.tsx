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
  country?: string;
  country_id?: string;
  value_usd?: number;
  valueUsd?: number;
  stage?: string | number;
  stage_number?: number;
};

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function achievementPercent(achieved: number, target: number) {
  if (target <= 0) return "0.0%";
  return `${((achieved / target) * 100).toFixed(1)}%`;
}

function leadValue(lead: Lead) {
  return lead.value_usd ?? lead.valueUsd ?? 0;
}

function leadCountry(lead: Lead, countriesByID: Map<string, string>) {
  return lead.country ?? (lead.country_id ? countriesByID.get(lead.country_id) : undefined);
}

function leadStageNumber(lead: Lead) {
  if (typeof lead.stage_number === "number") return lead.stage_number;
  if (typeof lead.stage === "number") return lead.stage;
  if (typeof lead.stage === "string") {
    const parsed = Number.parseInt(lead.stage, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
  const { data: allLeadsData } = useSWR<LeadsApiResponse | Lead[]>(
    canFetch ? "/api/v1/leads?limit=100" : null,
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
  const allLeads = Array.isArray(allLeadsData) ? allLeadsData : allLeadsData?.items ?? allLeadsData?.leads ?? [];

  const rows = COUNTRIES.map((country) => {
    const countryID = countryIDsByName.get(country.name);
    const countryTenants = (tenants ?? []).filter((tenant) => {
      const tenantCountry = tenant.country ?? (tenant.country_id ? countriesByID.get(tenant.country_id) : undefined);
      return tenantCountry === country.name;
    });
    const achieved = leads
      .filter((lead) => leadCountry(lead, countriesByID) === country.name || lead.country_id === countryID)
      .reduce((sum, lead) => sum + leadValue(lead), 0);
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
  const selectedRow = selectedCountry ? rows.find((country) => country.name === selectedCountry) : undefined;
  const selectedCountryID = selectedCountry ? countryIDsByName.get(selectedCountry) : undefined;
  const selectedCountryTenants = selectedCountry
    ? (tenants ?? [])
        .filter((tenant) => {
          const tenantCountry = tenant.country ?? (tenant.country_id ? countriesByID.get(tenant.country_id) : undefined);
          return tenantCountry === selectedCountry;
        })
        .sort((a, b) => tenantARR(b) - tenantARR(a))
    : [];
  const selectedCountryLeads = selectedCountry
    ? allLeads.filter((lead) => leadCountry(lead, countriesByID) === selectedCountry || lead.country_id === selectedCountryID)
    : [];
  const stageNames = new Map((pipeline?.by_stage ?? []).map((stage) => [stage.stage, stage.name]));
  const selectedStageBreakdown = Array.from(
    selectedCountryLeads.reduce<Map<number, { stage: number; name: string; count: number; value: number }>>((acc, lead) => {
      const stage = leadStageNumber(lead);
      if (typeof stage !== "number") return acc;
      const existing = acc.get(stage) ?? {
        stage,
        name: stageNames.get(stage) ?? `Stage ${stage}`,
        count: 0,
        value: 0,
      };
      existing.count += 1;
      existing.value += leadValue(lead);
      acc.set(stage, existing);
      return acc;
    }, new Map()).values(),
  ).sort((a, b) => a.stage - b.stage);

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
          <Link
            aria-label={`View ${country.name} performance details`}
            className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
            href={`/country-performance?country=${encodeURIComponent(country.name)}`}
            key={country.code}
            onKeyDown={(event) => {
              if (event.key === " ") {
                event.preventDefault();
                event.currentTarget.click();
              }
            }}
          >
            <Card
              className={`h-full overflow-hidden transition hover:border-teal-200 hover:shadow-sm ${
                selectedCountry === country.name ? "border-teal-300 bg-teal-50/40 shadow-md ring-1 ring-teal-100" : ""
              }`}
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
                <Metric label="Pipeline Value" value={formatUSD(country.pipelineValue)} icon={BarChart3} emphasized={pipelineView || selectedCountry === country.name} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {selectedRow && (
        <Card>
          <CardHeader className="flex flex-col gap-3 border-b sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{selectedRow.name} Performance Details</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Country-level target, tenant, and pipeline context.</p>
            </div>
            <Link className="text-sm font-medium text-teal-700 underline-offset-4 hover:underline" href="/country-performance">
              Clear country selection
            </Link>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Total ARR" value={formatUSD(selectedRow.totalARR)} icon={TrendingUp} />
              <Metric label="Q3 Target" value={formatUSD(selectedRow.q3Target)} icon={Target} />
              <Metric label="Achievement" value={selectedRow.achievement} icon={TrendingUp} />
              <Metric label="Revenue Gap" value={formatUSD(selectedRow.revenueGap)} icon={AlertTriangle} />
              <Metric label="Active Tenants" value={selectedRow.activeTenants.toLocaleString("en-US")} icon={Building2} />
              <Metric label="At-Risk Tenants" value={selectedRow.atRiskTenants.toLocaleString("en-US")} icon={AlertTriangle} />
              <Metric label="Pipeline Value" value={formatUSD(selectedRow.pipelineValue)} icon={BarChart3} emphasized />
              <Metric label="Country Forecast" value="—" detail="No country forecast data available" icon={TrendingUp} />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h2 className="text-base font-semibold">Top Tenants</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-3 pr-4 font-medium">Tenant</th>
                        <th className="py-3 pr-4 font-medium">Sector</th>
                        <th className="py-3 pr-4 font-medium">ARR</th>
                        <th className="py-3 font-medium">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCountryTenants.slice(0, 5).map((tenant) => (
                        <tr className="border-b last:border-0" key={tenant.id}>
                          <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{tenant.sector ?? tenant.sector_name ?? "—"}</td>
                          <td className="py-3 pr-4 font-semibold">{formatUSD(tenantARR(tenant))}</td>
                          <td className="py-3">{tenant.risk_score ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!selectedCountryTenants.length && <p className="mt-4 text-sm text-muted-foreground">No tenants available for this country.</p>}
              </div>

              <div className="rounded-lg border p-4">
                <h2 className="text-base font-semibold">Pipeline Stage Breakdown</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-3 pr-4 font-medium">Stage</th>
                        <th className="py-3 pr-4 font-medium">Count</th>
                        <th className="py-3 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedStageBreakdown.map((stage) => (
                        <tr className="border-b last:border-0" key={stage.stage}>
                          <td className="py-3 pr-4 font-medium">{stage.name}</td>
                          <td className="py-3 pr-4">{stage.count}</td>
                          <td className="py-3 font-semibold">{formatUSD(stage.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!selectedStageBreakdown.length && (
                  <p className="mt-4 text-sm text-muted-foreground">Country pipeline stage breakdown is unavailable from the current API data.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
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
