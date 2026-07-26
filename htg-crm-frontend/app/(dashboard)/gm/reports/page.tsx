"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { countryNameByID } from "@/lib/countries";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    message?: string;
  } | null;
};

type UserProfile = {
  country_office_id?: string;
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
  return tenant.renewal_date ?? tenant.renewalDate ?? "";
}

function tenantHealthScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number };
  const score = source.health_score ?? source.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  const risk = tenant.risk_score ?? 0;
  return Math.max(0, 100 - (risk <= 1 ? risk * 100 : risk));
}

function tenantRiskScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number; riskScore?: number };
  const score = tenant.risk_score ?? source.riskScore;
  const health = source.health_score ?? source.healthScore;
  if (typeof score === "number" && score > 0) return score <= 1 ? score * 100 : score;
  if (typeof health === "number" && health > 0 && health <= 1) return (1 - health) * 100;
  if (typeof score === "number") return score;
  return 0;
}

function csvEscape(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export default function GMReportsPage() {
  const { data: session, status } = useSession();
  const [country, setCountry] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    let cancelled = false;
    async function loadProfile() {
      setLoadError("");
      try {
        const response = await fetch(`${API}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const body = (await response.json()) as ApiEnvelope<UserProfile> | UserProfile;
        if (!response.ok) {
          const envelope = body as ApiEnvelope<UserProfile>;
          throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
        }
        const profile = body && typeof body === "object" && "data" in body ? (body as ApiEnvelope<UserProfile>).data : (body as UserProfile);
        const countryName = countryNameByID(profile?.country_office_id);
        if (!countryName) throw new Error("GM profile is missing a country assignment");
        if (!cancelled) setCountry(countryName);
      } catch (error) {
        if (cancelled) return;
        setCountry("");
        setLoadError(error instanceof Error ? error.message : "Unable to load GM profile.");
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  async function downloadCsv() {
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    const response = await fetch(`${API}/api/v1/tenants`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const json = (await response.json()) as ApiEnvelope<Tenant[] | { tenants?: Tenant[]; items?: Tenant[] }>;
    const tenants = unwrapTenants(json.data);
    const headers = ["Name", "Sector", "ARR", "MRR", "Health Score", "Risk Score", "Status", "Renewal Date"];
    const rows = tenants.map((tenant) => [
      tenant.name,
      tenantSector(tenant),
      tenantARR(tenant),
      tenantMRR(tenant),
      tenantHealthScore(tenant).toFixed(0),
      tenantRiskScore(tenant).toFixed(0),
      tenant.status ?? "UNKNOWN",
      tenantRenewalDate(tenant),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${country}-tenants-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;
  if (loadError || !country) return <div className="p-8 text-gray-500">{loadError || "No country assignment found for this GM."}</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">GM Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Country performance reports and data exports.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Country Summary Report</h2>
          <p className="mt-2 text-sm text-gray-500">Download a summary of country performance, pipeline, and at-risk accounts.</p>
          <button
            className="mt-6 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-500"
            disabled
            title="Coming soon"
            type="button"
          >
            Download PDF
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800">Tenant Revenue Data</h2>
          <p className="mt-2 text-sm text-gray-500">Export all tenant ARR, MRR, health, and risk data as a spreadsheet.</p>
          <button
            className="mt-6 rounded-lg bg-[#0A9599] px-4 py-2 text-sm font-semibold text-white hover:bg-[#087b7f]"
            onClick={downloadCsv}
            type="button"
          >
            Download CSV
          </button>
          <p className="mt-3 text-xs text-gray-500">Export values use the current {country} tenant data. ARR values are formatted like {formatUSD(100000)}.</p>
        </div>
      </div>
    </div>
  );
}
