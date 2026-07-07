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

function tenantMRR(tenant: Tenant) {
  return tenant.mrr_usd ?? tenant.monthly_revenue_usd ?? tenantARR(tenant) / 12;
}

function tenantSector(tenant: Tenant) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantRenewalDate(tenant: Tenant) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function tenantHealthScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number };
  const score = source.health_score ?? source.healthScore;
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

function riskClass(score: number) {
  if (score > 50) return "bg-red-100 text-red-700";
  if (score >= 20) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function statusClass(status?: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "AT_RISK") return "bg-red-100 text-red-700";
  if (status === "PROSPECT") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GMTenantsPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");

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

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) => {
      return tenant.name.toLowerCase().includes(query) || tenantSector(tenant).toLowerCase().includes(query);
    });
  }, [search, tenants]);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Tenants</h1>
        <p className="mt-1 text-sm text-gray-500">All customers and accounts in {country}.</p>
        <input
          className="mt-5 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by tenant name or sector"
          type="search"
          value={search}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Sector</th>
                <th className="py-3 pr-4 text-right font-medium">ARR</th>
                <th className="py-3 pr-4 text-right font-medium">MRR</th>
                <th className="py-3 pr-4 text-right font-medium">Health Score</th>
                <th className="py-3 pr-4 text-right font-medium">Risk Score</th>
                <th className="py-3 pr-4 text-right font-medium">Status</th>
                <th className="py-3 text-right font-medium">Renewal Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => {
                const health = tenantHealthScore(tenant);
                const risk = tenant.risk_score ?? 0;
                return (
                  <tr className="border-b last:border-0" key={tenant.id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-3 pr-4 text-right">{formatUSD(tenantMRR(tenant))}</td>
                    <td className={`py-3 pr-4 text-right font-semibold ${healthClass(health)}`}>{health.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${riskClass(risk)}`}>{risk}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(tenant.status)}`}>
                        {tenant.status ?? "UNKNOWN"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filteredTenants.length && <p className="py-8 text-sm text-gray-500">No tenants found for this country.</p>}
      </div>
    </div>
  );
}
