"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, CalendarClock, CheckCircle2, HeartPulse, Repeat2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type TenantWithExtras = Tenant & {
  owner?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  account_manager?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  tenant_country?: string | null;
  health_score?: number | null;
  healthScore?: number | null;
};

const mockTenants: TenantWithExtras[] = [
  {
    id: "kenya-tenant-01",
    name: "Kenya Tenant 01",
    country: "Kenya",
    sector: "Telecom",
    arr_usd: 720000,
    mrr_usd: 60000,
    health_score: 91,
    risk_score: 8,
    status: "ACTIVE",
    renewal_date: "2027-06-30",
  },
  {
    id: "kenya-tenant-02",
    name: "Kenya Tenant 02",
    country: "Kenya",
    sector: "Finance",
    arr_usd: 540000,
    mrr_usd: 45000,
    health_score: 89,
    risk_score: 10,
    status: "ACTIVE",
    renewal_date: "2027-03-31",
  },
  {
    id: "kenya-tenant-03",
    name: "Kenya Tenant 03",
    country: "Kenya",
    sector: "Government",
    arr_usd: 180000,
    mrr_usd: 15000,
    health_score: 78,
    risk_score: 22,
    status: "ACTIVE",
    renewal_date: "2026-12-15",
  },
  {
    id: "kenya-tenant-04",
    name: "Kenya Tenant 04",
    country: "Kenya",
    sector: "Healthcare",
    arr_usd: 150000,
    mrr_usd: 12500,
    health_score: 58,
    risk_score: 58,
    status: "AT_RISK",
    renewal_date: "2026-09-30",
  },
  {
    id: "kenya-tenant-05",
    name: "Kenya Tenant 05",
    country: "Kenya",
    sector: "Logistics",
    arr_usd: 300000,
    mrr_usd: 25000,
    health_score: 83,
    risk_score: 15,
    status: "ACTIVE",
    renewal_date: "2027-01-31",
  },
];

function unwrapList<T>(value: T[] | { items?: T[]; tenants?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.tenants ?? [];
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
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
}

function tenantARR(tenant: TenantWithExtras) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantRenewalDate(tenant: TenantWithExtras) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function tenantCountry(tenant: TenantWithExtras) {
  return tenant.country ?? tenant.country_name ?? tenant.countryName ?? tenant.tenant_country ?? "";
}

function tenantHealthScore(tenant: TenantWithExtras) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function tenantOwnerValue(tenant: TenantWithExtras) {
  return tenant.account_manager_name ?? tenant.account_manager ?? tenant.owner_name ?? tenant.owner ?? tenant.account_manager_id ?? tenant.owner_id ?? "";
}

function matchesAM(value: string, amName: string, amId: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return false;
  return normalizedValue === amName.toLowerCase() || Boolean(amId && normalizedValue === amId.toLowerCase());
}

function assignedTenants(tenants: TenantWithExtras[], amName: string, amId: string) {
  const hasOwnerData = tenants.some((tenant) => tenantOwnerValue(tenant));
  if (!hasOwnerData) return [];

  return tenants.filter((tenant) => matchesAM(tenantOwnerValue(tenant), amName, amId));
}

function scopedCustomers(tenants: TenantWithExtras[], amName: string, amId: string) {
  const assignedCustomers = assignedTenants(tenants, amName, amId);
  if (assignedCustomers.length > 0) return assignedCustomers;

  const kenyaCustomers = tenants
    .filter((tenant) => tenantCountry(tenant).toLowerCase() === "kenya")
    .slice(0, 5);

  return kenyaCustomers.length > 0 ? kenyaCustomers : tenants.slice(0, 5);
}

function daysUntil(dateValue: string | null) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysClass(days: number) {
  if (days < 30) return "bg-red-100 text-red-700";
  if (days <= 90) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function healthClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function riskClass(score: number) {
  if (score > 50) return "bg-red-100 text-red-700";
  if (score >= 20) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function statusClass(status?: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "AT_RISK") return "bg-red-100 text-red-700";
  if (status === "PROSPECT") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function retentionAction(days: number) {
  if (days < 30) return "Prepare proposal";
  if (days <= 90) return "Schedule renewal meeting";
  return "Monitor account";
}

function retentionPriority(tenant: TenantWithExtras, days: number | null) {
  const risk = tenant.risk_score ?? 0;
  if (risk > 70 || (days !== null && days < 30)) return "High";
  if (risk > 50 || (days !== null && days < 90)) return "Medium";
  return "Low";
}

function recommendedPlan(tenant: TenantWithExtras, days: number | null) {
  const risk = tenant.risk_score ?? 0;
  const health = tenantHealthScore(tenant);

  if (risk > 70) return "Executive meeting";
  if (risk > 50) return "Retention discount";
  if (health > 80 && risk < 20) return "Cross-sell";
  if (days !== null && days < 60) return "Customer success review";
  return "Technical workshop";
}

function renewalStage(tenant: TenantWithExtras, days: number | null) {
  const risk = tenant.risk_score ?? 0;

  if (risk > 50) return "At Risk";
  if (days !== null && days > 90 && risk < 30) return "Renewal Scheduled";
  if (days !== null && days >= 30 && days <= 90 && risk < 50) return "Proposal Sent";
  if (days !== null && days < 30 && risk < 50) return "Negotiation";
  return "Renewal Scheduled";
}

function KpiCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="h-32 p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-[#0A9599]">{icon}</div>
        </div>
        <div className="mt-8 text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CoachMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AMRenewalsPage() {
  const { data: session, status } = useSession();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);

  const amName =
    (session as { user?: { name?: string | null } } | null)?.user?.name ??
    (session as { name?: string | null } | null)?.name ??
    "Account Manager";
  const amId =
    (session as { user?: { id?: string | null } } | null)?.user?.id ??
    (session as { id?: string | null } | null)?.id ??
    "";

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function loadRenewals() {
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const tenantsResponse = await fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>(
          "/api/v1/tenants",
          token,
        );
        const tenants = unwrapList<TenantWithExtras>(tenantsResponse);
        if (!cancelled) setTenantsData(tenants.length ? tenants : mockTenants);
      } catch (error) {
        console.error("AM renewals fetch failed", error);
        if (!cancelled) setTenantsData(mockTenants);
      }
    }

    void loadRenewals();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const myCustomers = useMemo(() => scopedCustomers(tenantsData, amName, amId), [amId, amName, tenantsData]);
  const renewalRows = useMemo(
    () =>
      myCustomers
        .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
        .filter((row): row is { tenant: TenantWithExtras; days: number } => row.days !== null)
        .sort((a, b) => a.days - b.days),
    [myCustomers],
  );

  const within30 = renewalRows.filter((row) => row.days >= 0 && row.days < 30);
  const within90 = renewalRows.filter((row) => row.days >= 0 && row.days <= 90);
  const renewalARR = within90.reduce((sum, row) => sum + tenantARR(row.tenant), 0);
  const highRiskRenewals = within90.filter((row) => (row.tenant.risk_score ?? 0) > 50);
  const renewalRiskARR = highRiskRenewals.reduce((sum, row) => sum + tenantARR(row.tenant), 0);
  const retentionHealth =
    myCustomers.length > 0
      ? myCustomers.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / myCustomers.length
      : 0;
  const retentionPriorities = renewalRows.filter((row) => (row.tenant.risk_score ?? 0) > 50 || (row.days >= 0 && row.days <= 90));
  const stages = ["Renewal Scheduled", "Proposal Sent", "Negotiation", "At Risk", "Renewed"].map((stage) => {
    if (stage === "Renewed") return { stage, count: 0, arr: 0 };
    const stageRows = renewalRows.filter((row) => renewalStage(row.tenant, row.days) === stage);
    return {
      stage,
      count: stageRows.length,
      arr: stageRows.reduce((sum, row) => sum + tenantARR(row.tenant), 0),
    };
  });
  const nextRenewal = renewalRows.find((row) => row.days >= 0) ?? renewalRows[0];
  const highestRiskRenewal = [...renewalRows].sort((a, b) => (b.tenant.risk_score ?? 0) - (a.tenant.risk_score ?? 0))[0];

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Renewals</h1>
        <p className="mt-2 text-sm text-gray-500">
          Manage upcoming renewals, customer retention plans, and recurring revenue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard title="Renewals Due (30 Days)" value={within30.length} icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard title="Renewals Due (90 Days)" value={within90.length} icon={<Repeat2 className="h-5 w-5" />} />
        <KpiCard title="Renewal ARR" value={formatUSD(renewalARR)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <KpiCard title="Renewal Risk ARR" value={formatUSD(renewalRiskARR)} icon={<AlertTriangle className="h-5 w-5" />} />
        <KpiCard title="High Risk Renewals" value={highRiskRenewals.length} icon={<ShieldCheck className="h-5 w-5" />} />
        <KpiCard title="Retention Health" value={`${retentionHealth.toFixed(0)}%`} icon={<HeartPulse className="h-5 w-5" />} />
      </div>

      <Section title="Upcoming Renewals">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 text-right font-semibold">ARR</th>
                <th className="py-3 pr-4 font-semibold">Renewal Date</th>
                <th className="py-3 pr-4 font-semibold">Days Remaining</th>
                <th className="py-3 pr-4 font-semibold">Health</th>
                <th className="py-3 pr-4 font-semibold">Risk</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Retention Action</th>
              </tr>
            </thead>
            <tbody>
              {renewalRows.map(({ tenant, days }) => {
                const health = tenantHealthScore(tenant);
                const risk = tenant.risk_score ?? 0;

                return (
                  <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4 font-semibold text-gray-900">{tenant.name}</td>
                    <td className="py-4 pr-4 text-right font-semibold text-gray-900">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-4 pr-4 text-gray-600">{formatDate(tenantRenewalDate(tenant))}</td>
                    <td className="py-4 pr-4">
                      <Badge className={daysClass(days)}>{days} days</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={healthClass(health)}>{health.toFixed(0)}</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={riskClass(risk)}>{risk}</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={statusClass(tenant.status)}>{tenant.status ?? "UNKNOWN"}</Badge>
                    </td>
                    <td className="py-4 pr-4 text-[#0A9599] font-semibold">{retentionAction(days)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Retention Priorities">
        {retentionPriorities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-semibold">Customer</th>
                  <th className="py-3 pr-4 font-semibold">Renewal</th>
                  <th className="py-3 pr-4 text-right font-semibold">ARR</th>
                  <th className="py-3 pr-4 font-semibold">Health</th>
                  <th className="py-3 pr-4 font-semibold">Risk</th>
                  <th className="py-3 pr-4 font-semibold">Priority</th>
                  <th className="py-3 pr-4 font-semibold">Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {retentionPriorities.map(({ tenant, days }) => {
                  const health = tenantHealthScore(tenant);
                  const risk = tenant.risk_score ?? 0;
                  const priority = retentionPriority(tenant, days);

                  return (
                    <tr key={tenant.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 pr-4 font-semibold text-gray-900">{tenant.name}</td>
                      <td className="py-4 pr-4 text-gray-600">{formatDate(tenantRenewalDate(tenant))}</td>
                      <td className="py-4 pr-4 text-right font-semibold text-gray-900">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-4 pr-4">
                        <Badge className={healthClass(health)}>{health.toFixed(0)}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge className={riskClass(risk)}>{risk}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge className={priorityClass(priority)}>{priority}</Badge>
                      </td>
                      <td className="py-4 pr-4 text-[#0A9599] font-semibold">{recommendedPlan(tenant, days)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No retention priorities need immediate action.</p>
        )}
      </Section>

      <Section title="Renewal Pipeline">
        <div className="grid gap-4 md:grid-cols-5">
          {stages.map((stage) => (
            <div key={stage.stage} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-500">{stage.stage}</p>
              <p className="mt-3 text-2xl font-bold text-gray-900">{stage.count}</p>
              <p className="mt-1 text-sm font-semibold text-[#0A9599]">{formatUSD(stage.arr)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Customer Retention Plan">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {myCustomers.map((tenant) => {
            const days = daysUntil(tenantRenewalDate(tenant));
            const health = tenantHealthScore(tenant);
            const risk = tenant.risk_score ?? 0;

            return (
              <div key={tenant.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">Renewal: {formatDate(tenantRenewalDate(tenant))}</p>
                  </div>
                  <Badge className={riskClass(risk)}>Risk {risk}</Badge>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge className={healthClass(health)}>Health {health.toFixed(0)}</Badge>
                  <span className="text-sm text-gray-500">{days !== null ? `${days} days remaining` : "No renewal date"}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[#0A9599]">{recommendedPlan(tenant, days)}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Renewal Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <CoachMetric
            label="Next Renewal"
            value={nextRenewal ? `${nextRenewal.tenant.name} (${nextRenewal.days} days)` : "No renewal scheduled"}
          />
          <CoachMetric
            label="Highest Risk Renewal"
            value={highestRiskRenewal ? `${highestRiskRenewal.tenant.name} (${highestRiskRenewal.tenant.risk_score ?? 0})` : "No renewal risk"}
          />
          <CoachMetric label="Renewal ARR" value={formatUSD(renewalRiskARR)} />
        </div>
        <div className="mt-5 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
          {highestRiskRenewal
            ? `Prioritize ${highestRiskRenewal.tenant.name} before the renewal window closes.`
            : "Keep renewal plans updated and monitor customer health weekly."}
        </div>
      </section>
    </div>
  );
}
