"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRIES = ["Somalia", "Kenya", "Ethiopia", "Djibouti"];

const COUNTRY_GMS: Record<string, string> = {
  Somalia: "GM Somalia",
  Kenya: "GM Kenya",
  Ethiopia: "GM Ethiopia",
  Djibouti: "GM Djibouti",
};

type TenantRow = {
  id?: string;
  name?: string;
  country?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  status?: string | null;
  risk_score?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  monthly_revenue_usd?: number | null;
  mrr_usd?: number | null;
  health_score?: number | null;
  healthScore?: number | null;
  health?: string | null;
};

type TargetRow = {
  country?: string | null;
  account_manager_id?: string | null;
  target_arr?: number | null;
  target_arr_usd?: number | null;
  targetArrUsd?: number | null;
};

type InterventionSignal = {
  country: string;
  message: string;
  tone: "critical" | "warning";
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

function tenantARR(tenant: TenantRow) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: TenantRow) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function targetARR(target: TargetRow) {
  return target.target_arr_usd ?? target.target_arr ?? target.targetArrUsd ?? 0;
}

function statusClass(achievement: number) {
  return achievement >= 80 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
}

function signalClass(tone: InterventionSignal["tone"]) {
  return tone === "critical" ? "border-red-200 bg-red-50 text-red-800" : "border-yellow-200 bg-yellow-50 text-yellow-800";
}

export default function HOBCountriesPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API}/api/v1/tenants`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTenants(unwrapList<TenantRow>(json.data ?? json, ["tenants", "items"])))
      .catch(() => setTenants([]));

    fetch(`${API}/api/v1/targets?quarter=3&year=2026`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTargets(unwrapList<TargetRow>(json.data ?? json, ["targets", "items"])))
      .catch(() => setTargets([]));
  }, [status, session]);

  const countryTargets = useMemo(() => targets.filter((target) => !target.account_manager_id), [targets]);

  const countryRows = useMemo(() => {
    return COUNTRIES.map((country) => {
      const countryTenants = tenants.filter((tenant) => tenant.country === country);
      const arr = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
      const q3Target = countryTargets
        .filter((target) => target.country === country)
        .reduce((sum, target) => sum + targetARR(target), 0);
      const achievement = q3Target > 0 ? (arr / q3Target) * 100 : 0;
      const activeTenants = countryTenants.filter((tenant) => tenant.status === "ACTIVE").length;
      const atRiskTenants = countryTenants.filter((tenant) => (tenant.risk_score ?? 0) > 50).length;
      const healthScore =
        countryTenants.length > 0
          ? countryTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / countryTenants.length
          : 0;

      const sectorTotals = countryTenants.reduce((map, tenant) => {
        const sector = tenantSector(tenant);
        map.set(sector, (map.get(sector) ?? 0) + tenantARR(tenant));
        return map;
      }, new Map<string, number>());
      const topSector = Array.from(sectorTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unassigned";
      const biggestCustomer =
        [...countryTenants].sort((a, b) => tenantARR(b) - tenantARR(a))[0]?.name ?? "No customers";

      return {
        activeTenants,
        arr,
        atRiskTenants,
        biggestCustomer,
        country,
        gm: COUNTRY_GMS[country],
        healthScore,
        q3Target,
        achievement,
        topSector,
      };
    });
  }, [countryTargets, tenants]);

  const totalCountryARR = countryRows.reduce((sum, country) => sum + country.arr, 0);
  const countriesOnTarget = countryRows.filter((country) => country.achievement >= 80).length;
  const countriesBehind = countryRows.filter((country) => country.achievement < 80).length;

  const interventionSignals = useMemo(() => {
    const signals: InterventionSignal[] = [];
    countryRows.forEach((country) => {
      if (country.achievement < 70) {
        signals.push({
          country: country.country,
          message: `${country.country} is critically behind - ${country.achievement.toFixed(1)}% of target`,
          tone: "critical",
        });
      }
      if (country.atRiskTenants > 1) {
        signals.push({
          country: country.country,
          message: `${country.country} has ${country.atRiskTenants} at-risk accounts`,
          tone: "warning",
        });
      }
      if (country.healthScore < 70) {
        signals.push({
          country: country.country,
          message: `${country.country} customer health is low - avg score ${country.healthScore.toFixed(0)}`,
          tone: "warning",
        });
      }
    });
    return signals;
  }, [countryRows]);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Countries</h1>
        <p className="mt-1 text-sm text-gray-500">Country portfolio - ARR, targets, pipeline, and intervention signals.</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Countries" value="4" />
        <KpiCard label="Countries On Target" value={countriesOnTarget.toString()} />
        <KpiCard label="Countries Behind" value={countriesBehind.toString()} />
        <KpiCard label="Total Country ARR" value={formatUSD(totalCountryARR)} />
      </div>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Country Portfolio</h2>
        <p className="mt-1 text-sm text-gray-500">Commercial performance view for each country business unit.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Country</th>
                <th className="py-3 pr-4 font-medium">GM</th>
                <th className="py-3 pr-4 text-right font-medium">ARR</th>
                <th className="py-3 pr-4 text-right font-medium">Q3 Target</th>
                <th className="py-3 pr-4 text-right font-medium">Achievement %</th>
                <th className="py-3 pr-4 text-right font-medium">Active Tenants</th>
                <th className="py-3 pr-4 text-right font-medium">At-Risk Tenants</th>
                <th className="py-3 pr-4 font-medium">Top Sector</th>
                <th className="py-3 pr-4 font-medium">Biggest Customer</th>
                <th className="py-3 pr-4 text-right font-medium">Health Score</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {countryRows.map((country) => (
                <tr className="border-b last:border-0" key={country.country}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{country.country}</td>
                  <td className="py-3 pr-4 text-gray-500">{country.gm}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(country.arr)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(country.q3Target)}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-[#0A9599]">{country.achievement.toFixed(1)}%</td>
                  <td className="py-3 pr-4 text-right">{country.activeTenants}</td>
                  <td className="py-3 pr-4 text-right">{country.atRiskTenants}</td>
                  <td className="py-3 pr-4">{country.topSector}</td>
                  <td className="py-3 pr-4">{country.biggestCustomer}</td>
                  <td className="py-3 pr-4 text-right">{country.healthScore.toFixed(0)}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(country.achievement)}`}>
                      {country.achievement >= 80 ? "On Target" : "Behind"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Countries Needing Attention</h2>
        <p className="mt-1 text-sm text-gray-500">Automatically generated commercial intervention signals.</p>
        <div className="mt-5 space-y-3">
          {interventionSignals.length > 0 ? (
            interventionSignals.map((signal) => (
              <div
                className={`rounded-lg border p-3 text-sm font-medium ${signalClass(signal.tone)}`}
                key={`${signal.country}-${signal.message}`}
              >
                {signal.message}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm text-[#0A9599]">
              All countries on track.
            </p>
          )}
        </div>
      </section>
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
