"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const SECTOR_BY_ID: Record<string, string> = {
  "a76b023f-7343-4d23-8653-51118277fbf7": "Agriculture",
  "d5f9d2da-06b2-4299-820d-bdf944643bfd": "Education",
  "df989d27-11eb-4d87-80e3-74b9e8ebfdea": "Energy",
  "59221f4e-b1bb-4044-b844-659bea171825": "Finance",
  "a507bfe5-bfc0-496f-9443-e27603fc77a2": "Government",
  "13933d31-10d7-45db-9ecb-042790fa8a59": "Healthcare",
  "dcce22ab-7c80-414e-8b30-e7361d87ae3d": "Hospitality",
  "fcb59619-1066-4857-8280-2dead6856281": "Logistics",
  "dca6440f-ee55-473a-a91e-9b00794277ac": "Manufacturing",
  "0fc039f3-1f73-4b60-801a-a9d13638a974": "NGO",
  "a2947294-74d8-4a53-b605-6d85f63bb720": "Retail",
  "d3ef1714-976e-4044-b844-659bea171825": "Telecom",
};

type TenantRow = {
  id?: string;
  name?: string | null;
  tenant_name?: string | null;
  company_name?: string | null;
  country?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  sector?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  sectorName?: string | null;
  status?: string | null;
  risk_score?: number | null;
  riskScore?: number | null;
  arr?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  mrr?: number | null;
  mrr_usd?: number | null;
  monthly_revenue_usd?: number | null;
  monthlyRevenueUsd?: number | null;
  health_score?: number | null;
  healthScore?: number | null;
  health?: string | null;
  renewal_date?: string | null;
  renewalDate?: string | null;
  services_count?: number | null;
  servicesCount?: number | null;
};

type AttentionSignal = {
  tone: "critical" | "warning";
  message: string;
};

type AuthSession = {
  accessToken?: string;
};

function unwrapList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }

  return [];
}

function tenantName(tenant: TenantRow) {
  return tenant.name ?? tenant.tenant_name ?? tenant.company_name ?? "Unnamed account";
}

function tenantCountry(tenant: TenantRow) {
  return tenant.country ?? tenant.country_name ?? tenant.countryName ?? "Unassigned";
}

function tenantSector(tenant: TenantRow) {
  return (
    tenant.sector ??
    tenant.sector_name ??
    tenant.sectorName ??
    (tenant.sector_id ? SECTOR_BY_ID[tenant.sector_id] : undefined) ??
    "Unassigned"
  );
}

function tenantARR(tenant: TenantRow) {
  return (
    tenant.arr_usd ??
    tenant.arrUsd ??
    tenant.arr ??
    (tenant.monthly_revenue_usd ?? tenant.monthlyRevenueUsd ?? tenant.mrr_usd ?? tenant.mrr ?? 0) * 12
  );
}

function tenantMRR(tenant: TenantRow) {
  return (
    tenant.monthly_revenue_usd ??
    tenant.monthlyRevenueUsd ??
    tenant.mrr_usd ??
    tenant.mrr ??
    tenantARR(tenant) / 12
  );
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;

  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;

  return Math.max(0, 100 - tenantRiskScore(tenant));
}

function tenantRiskScore(tenant: TenantRow) {
  return tenant.risk_score ?? tenant.riskScore ?? 0;
}

function tenantStatus(tenant: TenantRow) {
  return tenant.status ?? "ACTIVE";
}

function tenantRenewalDate(tenant: TenantRow) {
  return tenant.renewal_date ?? tenant.renewalDate ?? "";
}

function tenantServicesCount(tenant: TenantRow) {
  return tenant.services_count ?? tenant.servicesCount ?? 0;
}

function daysUntil(date: string) {
  if (!date) return null;

  const target = new Date(date);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  return Math.ceil((targetDay.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(date: string) {
  if (!date) return "Not set";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not set";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function growthLabel(tenant: TenantRow) {
  const annualizedMrr = tenantMRR(tenant) * 12;
  const arr = tenantARR(tenant);

  if (arr > annualizedMrr * 1.05) return "Growing";
  if (arr < annualizedMrr * 0.95) return "Declining";
  return "Stable";
}

function growthClass(growth: string) {
  if (growth === "Growing") return "text-green-600";
  if (growth === "Declining") return "text-red-600";
  return "text-yellow-600";
}

function healthClass(score: number) {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function riskClass(score: number) {
  if (score > 50) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 20) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
}

function statusClass(status: string) {
  if (status === "At Risk") return "bg-red-50 text-red-700 border-red-200";
  if (status === "Growth") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Strategic") return "bg-[#0A9599]/10 text-[#0A9599] border-[#0A9599]/30";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function accountStatus(tenant: TenantRow) {
  const risk = tenantRiskScore(tenant);
  const health = tenantHealthScore(tenant);
  const arr = tenantARR(tenant);

  if (risk > 50) return "At Risk";
  if (health >= 85 && risk < 20) return "Growth";
  if (arr >= 500_000) return "Strategic";
  return "Expansion";
}

function missingServiceFor(tenant: TenantRow) {
  const sector = tenantSector(tenant);

  if (sector === "Telecom") return "Cloud Security Package";
  if (sector === "Finance") return "Disaster Recovery";
  if (sector === "Government") return "Hybrid Cloud";
  if (sector === "Logistics") return "Data Analytics";
  if (sector === "Healthcare") return "Cloud Backup";
  return tenantServicesCount(tenant) === 0 ? "Managed Services" : "Optimization Review";
}

function priorityFor(tenant: TenantRow) {
  const health = tenantHealthScore(tenant);
  if (health >= 85) return "High";
  if (health >= 75) return "Medium";
  return "Low";
}

function renewalClass(days: number | null) {
  if (days === null) return "text-gray-500";
  if (days < 30) return "text-red-600";
  if (days < 90) return "text-yellow-600";
  return "text-gray-700";
}

function KpiCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-gray-500">{subtext}</p> : null}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export default function HOBAccountsPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    const token = (session as AuthSession).accessToken ?? "";
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`${API}/api/v1/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => {
        const data = unwrapList<TenantRow>(json?.data ?? json, ["tenants", "items", "results"]);
        setTenants(data);
      })
      .catch((error) => {
        console.error("Failed to load strategic accounts", error);
        setTenants([]);
      })
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const strategicAccounts = useMemo(
    () => [...tenants].sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 10),
    [tenants],
  );

  const metrics = useMemo(() => {
    const strategicARR = strategicAccounts.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
    const averageHealth =
      strategicAccounts.length === 0
        ? 0
        : strategicAccounts.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / strategicAccounts.length;
    const atRisk = strategicAccounts.filter((tenant) => tenantRiskScore(tenant) > 50).length;
    const crossSellPotential = strategicAccounts.filter(
      (tenant) => tenantStatus(tenant) === "ACTIVE" && tenantHealthScore(tenant) > 80,
    ).length;
    const renewals = strategicAccounts.filter((tenant) => {
      const days = daysUntil(tenantRenewalDate(tenant));
      return days !== null && days >= 0 && days <= 90;
    }).length;

    return { strategicARR, averageHealth, atRisk, crossSellPotential, renewals };
  }, [strategicAccounts]);

  const attentionSignals = useMemo<AttentionSignal[]>(() => {
    const signals: AttentionSignal[] = [];

    strategicAccounts.forEach((tenant) => {
      const name = tenantName(tenant);
      const risk = tenantRiskScore(tenant);
      const health = tenantHealthScore(tenant);
      const days = daysUntil(tenantRenewalDate(tenant));

      if (risk > 50) {
        signals.push({ tone: "critical", message: `${name} has elevated risk score ${risk}.` });
      }

      if (days !== null && days >= 0 && days <= 30) {
        signals.push({ tone: "critical", message: `${name} renews in ${days} days.` });
      } else if (days !== null && days > 30 && days <= 90) {
        signals.push({ tone: "warning", message: `${name} renews in ${days} days.` });
      }

      if (health >= 80 && tenantARR(tenant) >= 400_000) {
        signals.push({
          tone: "warning",
          message: `${name} is a strong expansion candidate with ${Math.round(health)}% health.`,
        });
      }
    });

    return signals.slice(0, 8);
  }, [strategicAccounts]);

  const crossSellAccounts = useMemo(
    () => strategicAccounts.filter((tenant) => tenantHealthScore(tenant) > 75),
    [strategicAccounts],
  );

  if (status === "loading" || isLoading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Strategic Accounts" value={strategicAccounts.length.toString()} subtext="Top tenants by ARR" />
        <KpiCard label="Strategic ARR" value={formatUSD(metrics.strategicARR)} subtext="Top 10 contribution" />
        <KpiCard label="Average Health Score" value={`${Math.round(metrics.averageHealth)}%`} subtext="Customer health" />
        <KpiCard label="At-Risk Strategic" value={metrics.atRisk.toString()} subtext="Risk score above 50" />
        <KpiCard label="Cross-Sell Potential" value={metrics.crossSellPotential.toString()} subtext="Healthy active accounts" />
        <KpiCard label="Upcoming Renewals" value={metrics.renewals.toString()} subtext="Next 90 days" />
      </div>

      <Section title="Strategic Accounts" description="Top 10 customers by ARR across the company.">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Country</th>
                <th className="px-3 py-3">Sector</th>
                <th className="px-3 py-3 text-right">ARR</th>
                <th className="px-3 py-3 text-right">MRR</th>
                <th className="px-3 py-3">Health</th>
                <th className="px-3 py-3">Risk</th>
                <th className="px-3 py-3">Growth</th>
                <th className="px-3 py-3">Renewal</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {strategicAccounts.map((tenant) => {
                const health = Math.round(tenantHealthScore(tenant));
                const risk = tenantRiskScore(tenant);
                const growth = growthLabel(tenant);
                const renewalDays = daysUntil(tenantRenewalDate(tenant));
                const statusText = accountStatus(tenant);

                return (
                  <tr key={tenant.id ?? tenantName(tenant)}>
                    <td className="px-3 py-4 font-medium text-gray-900">{tenantName(tenant)}</td>
                    <td className="px-3 py-4">{tenantCountry(tenant)}</td>
                    <td className="px-3 py-4">{tenantSector(tenant)}</td>
                    <td className="px-3 py-4 text-right font-medium">{formatUSD(tenantARR(tenant))}</td>
                    <td className="px-3 py-4 text-right">{formatUSD(tenantMRR(tenant))}</td>
                    <td className="px-3 py-4">
                      <Badge className={healthClass(health)}>{health}%</Badge>
                    </td>
                    <td className="px-3 py-4">
                      <Badge className={riskClass(risk)}>{risk}</Badge>
                    </td>
                    <td className={`px-3 py-4 font-medium ${growthClass(growth)}`}>{growth}</td>
                    <td className={`px-3 py-4 ${renewalClass(renewalDays)}`}>
                      {formatDate(tenantRenewalDate(tenant))}
                    </td>
                    <td className="px-3 py-4">
                      <Badge className={statusClass(statusText)}>{statusText}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Executive Attention" description="Signals generated from the top strategic accounts.">
          <div className="space-y-3">
            {attentionSignals.length === 0 ? (
              <p className="text-sm text-gray-500">No executive attention signals for the top strategic accounts.</p>
            ) : (
              attentionSignals.map((signal, index) => (
                <div
                  key={`${signal.message}-${index}`}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    signal.tone === "critical"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-yellow-200 bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {signal.message}
                </div>
              ))
            )}
          </div>
        </Section>

        <Section title="Cross-Sell Opportunities" description="Healthy strategic accounts ready for expansion.">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Current Sector</th>
                  <th className="px-3 py-3">Missing Services</th>
                  <th className="px-3 py-3 text-right">Estimated Upsell</th>
                  <th className="px-3 py-3">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {crossSellAccounts.map((tenant) => {
                  const priority = priorityFor(tenant);
                  return (
                    <tr key={`${tenant.id ?? tenantName(tenant)}-cross-sell`}>
                      <td className="px-3 py-4 font-medium text-gray-900">{tenantName(tenant)}</td>
                      <td className="px-3 py-4">{tenantSector(tenant)}</td>
                      <td className="px-3 py-4">{missingServiceFor(tenant)}</td>
                      <td className="px-3 py-4 text-right font-medium text-[#0A9599]">
                        {formatUSD(tenantARR(tenant) * 0.15)}
                      </td>
                      <td className="px-3 py-4">
                        <Badge
                          className={
                            priority === "High"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }
                        >
                          {priority}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section title="Customer Growth Ranking" description="Strategic customers ranked by ARR contribution.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {strategicAccounts.map((tenant, index) => (
            <div key={`${tenant.id ?? tenantName(tenant)}-rank`} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A9599]/10 text-sm font-semibold text-[#0A9599]">
                  {index + 1}
                </span>
                <Badge className={statusClass(accountStatus(tenant))}>{accountStatus(tenant)}</Badge>
              </div>
              <p className="mt-4 font-semibold text-gray-900">{tenantName(tenant)}</p>
              <p className="mt-1 text-sm text-gray-500">{tenantCountry(tenant)} · {tenantSector(tenant)}</p>
              <p className="mt-4 text-xl font-semibold text-gray-900">{formatUSD(tenantARR(tenant))}</p>
              <p className="mt-1 text-sm text-gray-500">ARR contribution</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
