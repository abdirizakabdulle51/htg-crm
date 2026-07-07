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

function tenantHealthScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number };
  const score = source.health_score ?? source.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
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

export default function GMRenewalsPage() {
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

  const renewalRows = useMemo(
    () =>
      tenants
        .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
        .filter((row): row is { tenant: Tenant; days: number } => row.days !== null)
        .sort((a, b) => a.days - b.days),
    [tenants],
  );
  const within30 = renewalRows.filter((row) => row.days >= 0 && row.days < 30);
  const within90 = renewalRows.filter((row) => row.days >= 0 && row.days <= 90);
  const arrAtRisk = within90.reduce((sum, row) => sum + tenantARR(row.tenant), 0);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Renewals</h1>
        <p className="mt-1 text-sm text-gray-500">Upcoming contract renewals requiring action in {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Renewals within 30 days" value={within30.length.toString()} />
        <KpiCard label="Renewals within 90 days" value={within90.length.toString()} />
        <KpiCard label="Total ARR at renewal risk" value={formatUSD(arrAtRisk)} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Tenant</th>
                <th className="py-3 pr-4 font-medium">Sector</th>
                <th className="py-3 pr-4 text-right font-medium">ARR</th>
                <th className="py-3 pr-4 text-right font-medium">Renewal Date</th>
                <th className="py-3 pr-4 text-right font-medium">Days Remaining</th>
                <th className="py-3 pr-4 text-right font-medium">Health Score</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {renewalRows.map(({ tenant, days }) => (
                <tr className="border-b last:border-0" key={tenant.id}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{tenant.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                  <td className="py-3 pr-4 text-right text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${daysClass(days)}`}>{days} days</span>
                  </td>
                  <td className="py-3 pr-4 text-right">{tenantHealthScore(tenant).toFixed(0)}</td>
                  <td className="py-3 text-right text-gray-500">{tenant.status ?? "UNKNOWN"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!within90.length && <p className="py-8 text-sm text-gray-500">No renewals due in the next 90 days.</p>}
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
