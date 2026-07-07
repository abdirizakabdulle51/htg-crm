"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data?: T | null;
};

function unwrapTenants(value: Tenant[] | { tenants?: Tenant[]; items?: Tenant[] } | null | undefined) {
  if (Array.isArray(value)) return value;
  return value?.tenants ?? value?.items ?? [];
}

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: Tenant) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantRenewalDate(tenant: Tenant) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function rawHealthScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number };
  return source.health_score ?? source.healthScore;
}

function tenantHealthScore(tenant: Tenant) {
  const score = rawHealthScore(tenant);
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function healthClass(score: number) {
  if (score > 80) return "text-green-700";
  if (score >= 60) return "text-yellow-700";
  return "text-red-700";
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GMRisksPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const country =
    (session as { country?: string } | null)?.country ??
    (session as { user?: { country?: string } } | null)?.user?.country ??
    "Kenya";

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    fetch(`${API}/api/v1/tenants?country=${encodeURIComponent(country)}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json: ApiEnvelope<Tenant[] | { tenants?: Tenant[]; items?: Tenant[] }>) => {
        setTenants(unwrapTenants(json.data));
      })
      .catch(() => setTenants([]));
  }, [country, session, status]);

  const atRiskTenants = useMemo(
    () => tenants.filter((tenant) => (tenant.risk_score ?? 0) > 50).sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    [tenants],
  );
  const churnRiskARR = atRiskTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const decliningUsage = tenants.filter((tenant) => {
    const score = rawHealthScore(tenant);
    return typeof score === "number" ? score < 0.6 : tenantHealthScore(tenant) < 60;
  }).length;

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Risk Center</h1>
        <p className="mt-1 text-sm text-gray-500">At-risk accounts, churn exposure, and escalations in {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="At-Risk Tenants" value={atRiskTenants.length.toString()} />
        <KpiCard label="Churn Risk ARR" value={formatUSD(churnRiskARR)} />
        <KpiCard label="Declining Usage" value={decliningUsage.toString()} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">At-Risk Tenants</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Tenant</th>
                <th className="py-3 pr-4 font-medium">Sector</th>
                <th className="py-3 pr-4 text-right font-medium">ARR</th>
                <th className="py-3 pr-4 text-right font-medium">Risk Score</th>
                <th className="py-3 pr-4 text-right font-medium">Health Score</th>
                <th className="py-3 pr-4 text-right font-medium">Renewal Date</th>
                <th className="py-3 font-medium">Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {atRiskTenants.map((tenant) => {
                const risk = tenant.risk_score ?? 0;
                return (
                  <tr className="border-b last:border-0" key={tenant.id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-red-700">{risk}</td>
                    <td className={`py-3 pr-4 text-right font-semibold ${healthClass(tenantHealthScore(tenant))}`}>
                      {tenantHealthScore(tenant).toFixed(0)}
                    </td>
                    <td className="py-3 pr-4 text-right text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                    <td className="py-3 text-gray-700">
                      {risk > 70 ? "Immediate executive follow-up required" : "Schedule account review with AM"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!atRiskTenants.length && <p className="py-8 text-sm text-gray-500">No at-risk accounts - all tenants healthy.</p>}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">All Tenants Health Summary</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => {
            const health = tenantHealthScore(tenant);
            return (
              <div className="rounded-lg border border-gray-200 p-4" key={tenant.id}>
                <p className="font-medium text-gray-900">{tenant.name}</p>
                <p className={`mt-2 text-2xl font-semibold ${healthClass(health)}`}>{health.toFixed(0)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
