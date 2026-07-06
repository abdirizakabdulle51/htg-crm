"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { AlertTriangle, BarChart3, Building2, Target, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRY = "Kenya";
const STAGES = ["PROSPECT", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type TargetRow = {
  country?: string | null;
  account_manager_id?: string | null;
  target_arr_usd: number;
};

type TargetsResponse = {
  targets?: TargetRow[];
};

type LeadRow = {
  id: string;
  country?: string;
  stage?: string | number;
  stage_number?: number;
  stage_name?: string;
  value_usd?: number;
  valueUsd?: number;
};

type LeadsResponse = LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] };

function unwrapList<T>(value: T[] | { items?: T[]; tenants?: T[]; leads?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.tenants ?? value?.leads ?? [];
}

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: Tenant) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function riskClass(score: number) {
  if (score > 60) return "bg-red-500 text-white";
  if (score >= 30) return "bg-amber-500 text-white";
  return "bg-green-500 text-white";
}

function leadValue(lead: LeadRow) {
  return lead.value_usd ?? lead.valueUsd ?? 0;
}

function leadStage(lead: LeadRow): (typeof STAGES)[number] {
  const stageText = String(lead.stage_name ?? lead.stage ?? "").toUpperCase();
  if (stageText.includes("WON") || lead.stage_number === 9) return "WON";
  if (stageText.includes("LOST") || lead.stage_number === 10) return "LOST";
  if (stageText.includes("NEGOTIATION") || (lead.stage_number ?? 0) >= 7) return "NEGOTIATION";
  if (stageText.includes("PROPOSAL") || (lead.stage_number ?? 0) >= 5) return "PROPOSAL";
  if (stageText.includes("QUALIFIED") || (lead.stage_number ?? 0) >= 3) return "QUALIFIED";
  return "PROSPECT";
}

export function GMDashboard() {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const canFetch = Boolean(session);

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

  const { data: tenantsData, isLoading: tenantsLoading } = useSWR<Tenant[]>(
    canFetch ? "/api/v1/tenants" : null,
    authedFetcher,
    { refreshInterval: 120000 },
  );
  const { data: targetsData } = useSWR<TargetsResponse>(
    canFetch ? "/api/v1/targets?quarter=3&year=2026" : null,
    authedFetcher,
    { refreshInterval: 120000 },
  );
  const { data: leadsData } = useSWR<LeadsResponse>(
    canFetch ? `/api/v1/leads?country=${encodeURIComponent(COUNTRY)}` : null,
    authedFetcher,
    { refreshInterval: 60000 },
  );

  const tenants = useMemo(() => unwrapList<Tenant>(tenantsData), [tenantsData]);
  if (tenants[0]) {
    console.log("GM dashboard first tenant", tenants[0]);
  }
  const countryFromApi =
    tenants.find((tenant) => tenant.country?.toLowerCase() === COUNTRY.toLowerCase())?.country ?? COUNTRY;
  const kenyaTenants = useMemo(
    () => tenants.filter((tenant) => tenant.country === countryFromApi),
    [countryFromApi, tenants],
  );
  const leads = useMemo(() => unwrapList<LeadRow>(leadsData), [leadsData]);

  const countryARR = kenyaTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const q3Target =
    targetsData?.targets
      ?.find((target) => target.country?.toLowerCase() === COUNTRY.toLowerCase() && !target.account_manager_id)
      ?.target_arr_usd ?? 0;
  const achievement = q3Target > 0 ? (countryARR / q3Target) * 100 : 0;
  const revenueGap = Math.max(q3Target - countryARR, 0);
  const activeTenants = kenyaTenants.length;
  const atRiskTenants = kenyaTenants.filter((tenant) => (tenant.risk_score ?? 0) > 50).length;

  const topCustomers = useMemo(
    () => [...kenyaTenants].sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 5),
    [kenyaTenants],
  );

  const pipelineTotal = leads.reduce((sum, lead) => sum + leadValue(lead), 0);
  const stageCounts = useMemo(
    () =>
      STAGES.map((stage) => ({
        stage,
        count: leads.filter((lead) => leadStage(lead) === stage).length,
      })),
    [leads],
  );

  if (!session) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Country Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Country Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">{COUNTRY} Operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Country ARR" value={formatUSD(countryARR)} />
        <KpiCard icon={Target} label="Q3 Target" value={formatUSD(q3Target)} />
        <KpiCard icon={TrendingUp} label="Achievement" value={`${achievement.toFixed(1)}%`} />
        <KpiCard icon={BarChart3} label="Revenue Gap" value={formatUSD(revenueGap)} />
        <KpiCard icon={Users} label="Active Tenants" value={activeTenants.toString()} />
        <KpiCard icon={AlertTriangle} label="At-Risk Tenants" value={atRiskTenants.toString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 text-right font-medium">Risk Score</th>
                  <th className="py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((tenant) => {
                  const risk = tenant.risk_score ?? 0;
                  return (
                    <tr className="border-b last:border-0" key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenantSector(tenant)}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={riskClass(risk)}>{risk}</Badge>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{tenant.status ?? "UNKNOWN"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!topCustomers.length && (
            <p className="py-6 text-sm text-muted-foreground">
              {tenantsLoading ? "Loading Kenya customers..." : "No Kenya customers found."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
          <p className="text-sm text-muted-foreground">{formatUSD(pipelineTotal)} total pipeline value</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {stageCounts.map((stage) => (
              <div className="rounded-lg border bg-background p-4" key={stage.stage}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stage.stage}</p>
                <p className="mt-3 text-2xl font-semibold">{stage.count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}
