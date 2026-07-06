"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { CalendarClock, ShieldAlert, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatUSD } from "@/lib/utils";
import type { Contract, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

function tenantARR(tenant?: Tenant) {
  if (!tenant) return 0;
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function riskClass(score: number) {
  if (score >= 80) return "bg-red-500 text-white";
  if (score >= 60) return "bg-orange-500 text-white";
  return "bg-amber-500 text-white";
}

function riskReason(tenant: Tenant) {
  const score = tenant.risk_score ?? 0;
  if (score >= 80) return "Critical churn signal from high risk score and weak account health.";
  if (score >= 70) return "Elevated risk score indicates declining engagement or unresolved service concerns.";
  if (tenant.status === "AT_RISK") return "Tenant is marked at risk and needs executive follow-up.";
  return "Monitor account health before the risk score rises further.";
}

function recommendedAction(tenant: Tenant) {
  const score = tenant.risk_score ?? 0;
  if (score >= 80) return "Schedule an executive retention call this week.";
  if (score >= 70) return "Create a recovery plan with the account manager and service owner.";
  return "Confirm next action, renewal owner, and service satisfaction.";
}

function usageDeclinePercent(tenant: Tenant) {
  const score = tenant.risk_score ?? 0;
  return Math.min(45, Math.max(12, Math.round(score / 2)));
}

function daysUntil(endDate: string, provided?: number) {
  if (typeof provided === "number") return provided;
  const today = new Date();
  const end = new Date(endDate);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / 86400000));
}

export function StrategicRisks() {
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
  const { data: atRisk } = useSWR<Tenant[]>(canFetch ? "/api/v1/tenants/at-risk?limit=20" : null, authedFetcher, {
    refreshInterval: 120000,
  });
  const { data: renewals } = useSWR<Contract[]>(canFetch ? "/api/v1/tenants/renewals?days=90&limit=20" : null, authedFetcher, {
    refreshInterval: 120000,
  });

  const tenantByID = new Map((tenants ?? []).map((tenant) => [tenant.id, tenant]));
  const atRiskRows = (atRisk ?? []).slice().sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  const churnRiskARR = atRiskRows.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const decliningUsage = (tenants ?? [])
    .filter((tenant) => (tenant.risk_score ?? 0) >= 55 || tenant.status === "AT_RISK")
    .sort((a, b) => usageDeclinePercent(b) - usageDeclinePercent(a))
    .slice(0, 6);
  const renewalRows = (renewals ?? []).slice().sort((a, b) => daysUntil(a.end_date, a.days_to_expiry) - daysUntil(b.end_date, b.days_to_expiry));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Strategic Risks</h1>
        <p className="text-sm text-muted-foreground">Churn exposure, usage risk, and renewal pressure across the customer base.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Churn Risk ARR</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatUSD(churnRiskARR)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{atRiskRows.length} tenants at risk</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Declining Usage</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{decliningUsage.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tenants showing usage pressure</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-muted-foreground">90-Day Renewals</CardTitle>
            <CalendarClock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{renewalRows.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatUSD(renewalRows.reduce((sum, contract) => sum + (contract.value_usd ?? 0), 0))} contract value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>At-Risk Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Risk Score</th>
                  <th className="py-3 pr-4 font-medium">Reason</th>
                  <th className="py-3 font-medium">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {atRiskRows.map((tenant) => {
                  const score = tenant.risk_score ?? 0;
                  return (
                    <tr className="border-b last:border-0" key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenant.country ?? "Unassigned"}</td>
                      <td className="py-3 pr-4">
                        <Badge className={riskClass(score)}>{score}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{riskReason(tenant)}</td>
                      <td className="py-3">{recommendedAction(tenant)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!atRiskRows.length && <p className="py-6 text-sm text-muted-foreground">No at-risk tenants found.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenants with Declining Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {decliningUsage.map((tenant) => (
              <div className="flex items-center justify-between gap-4 rounded-md border p-3" key={tenant.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.country ?? "Unassigned"} - {tenant.sector ?? tenant.sector_name ?? "Unassigned"}
                  </p>
                </div>
                <Badge className="shrink-0 bg-orange-500 text-white">-{usageDeclinePercent(tenant)}%</Badge>
              </div>
            ))}
            {!decliningUsage.length && <p className="py-6 text-sm text-muted-foreground">No declining usage signals found.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Renewals within 90 Days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {renewalRows.map((contract) => {
              const tenant = tenantByID.get(contract.tenant_id);
              const days = daysUntil(contract.end_date, contract.days_to_expiry);
              return (
                <div className="flex items-center justify-between gap-4 rounded-md border p-3" key={contract.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{tenant?.name ?? contract.contract_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant?.country ?? "Unassigned"} - expires {formatDate(contract.end_date)}
                    </p>
                    <p className="text-xs font-medium">{formatUSD(contract.value_usd ?? tenantARR(tenant))}</p>
                  </div>
                  <Badge className="shrink-0 bg-amber-500 text-white">{days}d</Badge>
                </div>
              );
            })}
            {!renewalRows.length && <p className="py-6 text-sm text-muted-foreground">No renewals inside 90 days.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
