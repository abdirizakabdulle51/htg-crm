"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRIES = ["Somalia", "Kenya", "Ethiopia", "Djibouti"];

const COUNTRY_BY_ID: Record<string, string> = {
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

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
  "d3ef1714-976e-4048-b0fc-958d84995c9f": "Telecom",
};

type TenantRow = {
  id?: string;
  name?: string | null;
  tenant_name?: string | null;
  company_name?: string | null;
  country?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  sector?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  sectorName?: string | null;
  risk_score?: number | null;
  riskScore?: number | null;
  arr?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  monthly_revenue_usd?: number | null;
  monthlyRevenueUsd?: number | null;
  mrr?: number | null;
  mrr_usd?: number | null;
  health_score?: number | null;
  healthScore?: number | null;
  health?: string | null;
  renewal_date?: string | null;
  renewalDate?: string | null;
};

type CountryRiskRow = {
  arr: number;
  atRiskARR: number;
  country: string;
  criticalCustomers: number;
  healthScore: number;
  renewals: number;
  status: "Healthy" | "Watch" | "Critical";
};

type SectorRiskRow = {
  arr: number;
  atRiskARR: number;
  criticalCustomers: number;
  healthScore: number;
  riskLevel: "Low" | "Medium" | "High";
  sector: string;
};

type RiskSignal = {
  message: string;
  tone: "red" | "yellow" | "green";
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
  return (
    tenant.country ??
    tenant.country_name ??
    tenant.countryName ??
    (tenant.country_id ? COUNTRY_BY_ID[tenant.country_id] : undefined) ??
    "Unassigned"
  );
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

function tenantRiskScore(tenant: TenantRow) {
  return tenant.risk_score ?? tenant.riskScore ?? 0;
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;

  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;

  return Math.max(0, 100 - tenantRiskScore(tenant));
}

function tenantRenewalDate(tenant: TenantRow) {
  return tenant.renewal_date ?? tenant.renewalDate ?? "";
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

function isUpcomingRenewal(tenant: TenantRow) {
  const days = daysUntil(tenantRenewalDate(tenant));
  return days !== null && days >= 0 && days <= 90;
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

function countryStatus(row: Omit<CountryRiskRow, "status">): CountryRiskRow["status"] {
  const riskRatio = row.arr > 0 ? row.atRiskARR / row.arr : 0;
  if (row.healthScore < 60 || row.criticalCustomers > 0 || riskRatio >= 0.3) return "Critical";
  if (row.healthScore < 75 || row.atRiskARR > 0 || row.renewals > 0) return "Watch";
  return "Healthy";
}

function countryStatusClass(status: CountryRiskRow["status"]) {
  if (status === "Critical") return "bg-red-100 text-red-700";
  if (status === "Watch") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function sectorRiskLevel(row: Omit<SectorRiskRow, "riskLevel">): SectorRiskRow["riskLevel"] {
  const riskRatio = row.arr > 0 ? row.atRiskARR / row.arr : 0;
  if (row.criticalCustomers > 0 || row.healthScore < 60 || riskRatio >= 0.3) return "High";
  if (row.atRiskARR > 0 || row.healthScore < 75) return "Medium";
  return "Low";
}

function riskLevelClass(level: SectorRiskRow["riskLevel"]) {
  if (level === "High") return "bg-red-100 text-red-700";
  if (level === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function healthClass(score: number) {
  if (score >= 80) return "bg-green-50 text-green-700 border-green-200";
  if (score >= 60) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function riskClass(score: number) {
  if (score > 70) return "bg-red-50 text-red-700 border-red-200";
  if (score > 50) return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-green-50 text-green-700 border-green-200";
}

function signalClass(tone: RiskSignal["tone"]) {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "yellow") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  return "border-green-200 bg-green-50 text-green-800";
}

function recommendedAction(tenant: TenantRow) {
  const health = tenantHealthScore(tenant);
  const risk = tenantRiskScore(tenant);

  if (isUpcomingRenewal(tenant)) return "Renewal due";
  if (risk > 70) return "Executive meeting";
  if (health < 60) return "Recovery plan";
  return "Customer success review";
}

export default function HOBRisksPage() {
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
        console.error("Failed to load commercial risks", error);
        setTenants([]);
      })
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const atRiskTenants = useMemo(() => tenants.filter((tenant) => tenantRiskScore(tenant) > 50), [tenants]);
  const criticalTenants = useMemo(() => tenants.filter((tenant) => tenantRiskScore(tenant) > 70), [tenants]);

  const countryRows = useMemo<CountryRiskRow[]>(() => {
    return COUNTRIES.map((country) => {
      const countryTenants = tenants.filter((tenant) => tenantCountry(tenant) === country);
      const arr = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
      const atRiskARR = countryTenants
        .filter((tenant) => tenantRiskScore(tenant) > 50)
        .reduce((sum, tenant) => sum + tenantARR(tenant), 0);
      const healthScore =
        countryTenants.length > 0
          ? countryTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / countryTenants.length
          : 0;
      const row = {
        arr,
        atRiskARR,
        country,
        criticalCustomers: countryTenants.filter((tenant) => tenantRiskScore(tenant) > 70).length,
        healthScore,
        renewals: countryTenants.filter(isUpcomingRenewal).length,
      };

      return { ...row, status: countryStatus(row) };
    });
  }, [tenants]);

  const sectorRows = useMemo<SectorRiskRow[]>(() => {
    const sectors = new Set<string>();
    tenants.forEach((tenant) => sectors.add(tenantSector(tenant)));

    return Array.from(sectors)
      .map((sector) => {
        const sectorTenants = tenants.filter((tenant) => tenantSector(tenant) === sector);
        const arr = sectorTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
        const atRiskARR = sectorTenants
          .filter((tenant) => tenantRiskScore(tenant) > 50)
          .reduce((sum, tenant) => sum + tenantARR(tenant), 0);
        const healthScore =
          sectorTenants.length > 0
            ? sectorTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / sectorTenants.length
            : 0;
        const row = {
          arr,
          atRiskARR,
          criticalCustomers: sectorTenants.filter((tenant) => tenantRiskScore(tenant) > 70).length,
          healthScore,
          sector,
        };

        return { ...row, riskLevel: sectorRiskLevel(row) };
      })
      .sort((a, b) => b.atRiskARR - a.atRiskARR || b.arr - a.arr);
  }, [tenants]);

  const metrics = useMemo(() => {
    const commercialRiskARR = atRiskTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
    const averageHealth =
      tenants.length > 0 ? tenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / tenants.length : 0;

    return {
      averageHealth,
      commercialRiskARR,
      countriesAtRisk: countryRows.filter((country) => country.healthScore < 75).length,
      criticalAccounts: criticalTenants.length,
      upcomingStrategicRenewals: tenants.filter(isUpcomingRenewal).length,
    };
  }, [atRiskTenants, countryRows, criticalTenants, tenants]);

  const riskSignals = useMemo<RiskSignal[]>(() => {
    const signals: RiskSignal[] = [];

    countryRows.forEach((country) => {
      if (country.healthScore < 60) {
        signals.push({ message: `${country.country} commercial health is declining.`, tone: "red" });
      } else if (country.healthScore < 75) {
        signals.push({ message: `${country.country} commercial health requires monitoring.`, tone: "yellow" });
      }

      if (country.renewals > 1 && country.atRiskARR > 0) {
        signals.push({
          message: `${country.country} renewals exceed acceptable risk threshold.`,
          tone: country.status === "Critical" ? "red" : "yellow",
        });
      }
    });

    sectorRows.forEach((sector) => {
      if (sector.riskLevel === "High") {
        signals.push({ message: `${sector.sector} sector requires executive review.`, tone: "red" });
      } else if (sector.riskLevel === "Medium") {
        signals.push({ message: `${sector.sector} sector needs a customer health review.`, tone: "yellow" });
      }
    });

    criticalTenants.slice(0, 3).forEach((tenant) => {
      signals.push({
        message: `${tenantName(tenant)} requires executive intervention.`,
        tone: "red",
      });
    });

    if (signals.length === 0) {
      signals.push({ message: "Commercial risk posture is stable across all countries.", tone: "green" });
    }

    return signals.slice(0, 10);
  }, [countryRows, criticalTenants, sectorRows]);

  const executiveSummary = useMemo(() => {
    const highestRiskCountry = [...countryRows].sort(
      (a, b) => b.atRiskARR - a.atRiskARR || a.healthScore - b.healthScore,
    )[0];
    const highestRiskSector = [...sectorRows].sort(
      (a, b) => b.atRiskARR - a.atRiskARR || a.healthScore - b.healthScore,
    )[0];
    const highestRiskCustomer = [...tenants].sort(
      (a, b) => tenantRiskScore(b) - tenantRiskScore(a) || tenantARR(b) - tenantARR(a),
    )[0];
    const totalRevenueAtRisk = atRiskTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);

    return {
      highestRiskCountry,
      highestRiskCustomer,
      highestRiskSector,
      recommendation:
        highestRiskCountry && highestRiskSector
          ? `Prioritize ${highestRiskCountry.country} renewals and ${highestRiskSector.sector} recovery plans this week.`
          : "Continue monitoring risk exposure and renewal activity this week.",
      totalRevenueAtRisk,
    };
  }, [atRiskTenants, countryRows, sectorRows, tenants]);

  if (status === "loading" || isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Commercial Risk Center</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor commercial exposure, customer health, churn risk, renewals, and country intervention priorities.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Commercial Risk ARR" value={formatUSD(metrics.commercialRiskARR)} />
        <KpiCard label="At-Risk Customers" value={atRiskTenants.length.toString()} />
        <KpiCard label="Countries At Risk" value={metrics.countriesAtRisk.toString()} />
        <KpiCard label="Upcoming Strategic Renewals" value={metrics.upcomingStrategicRenewals.toString()} />
        <KpiCard label="Average Health Score" value={`${metrics.averageHealth.toFixed(0)}%`} />
        <KpiCard label="Critical Accounts" value={metrics.criticalAccounts.toString()} />
      </div>

      <Section title="Country Risk Summary" subtitle="Commercial exposure and health posture by country.">
        <Table minWidth="920px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Commercial ARR</th>
              <th className="py-3 pr-4 text-right font-medium">At-Risk ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Average Health</th>
              <th className="py-3 pr-4 text-right font-medium">Critical Customers</th>
              <th className="py-3 pr-4 text-right font-medium">Upcoming Renewals</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {countryRows.map((country) => (
              <tr className="border-b last:border-0" key={country.country}>
                <td className="py-3 pr-4 font-medium text-gray-900">{country.country}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(country.arr)}</td>
                <td className="py-3 pr-4 text-right">{formatUSD(country.atRiskARR)}</td>
                <td className="py-3 pr-4 text-right">{country.healthScore.toFixed(0)}%</td>
                <td className="py-3 pr-4 text-right">{country.criticalCustomers}</td>
                <td className="py-3 pr-4 text-right">{country.renewals}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${countryStatusClass(country.status)}`}>
                    {country.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Strategic Account Risks" subtitle="Customers with risk score above 50 and recommended commercial action.">
        <Table minWidth="1040px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Health</th>
              <th className="py-3 pr-4 text-right font-medium">Risk</th>
              <th className="py-3 pr-4 font-medium">Renewal</th>
              <th className="py-3 text-right font-medium">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {atRiskTenants.map((tenant) => {
              const health = tenantHealthScore(tenant);
              const risk = tenantRiskScore(tenant);
              return (
                <tr className="border-b last:border-0" key={tenant.id ?? tenantName(tenant)}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{tenantName(tenant)}</td>
                  <td className="py-3 pr-4 text-gray-500">{tenantCountry(tenant)}</td>
                  <td className="py-3 pr-4">{tenantSector(tenant)}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                  <td className="py-3 pr-4 text-right">
                    <Badge className={healthClass(health)}>{health.toFixed(0)}%</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Badge className={riskClass(risk)}>{risk}</Badge>
                  </td>
                  <td className="py-3 pr-4">{formatDate(tenantRenewalDate(tenant))}</td>
                  <td className="py-3 text-right font-semibold text-[#0A9599]">{recommendedAction(tenant)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Sector Risk Summary" subtitle="Risk exposure grouped by commercial sector.">
        <Table minWidth="820px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 pr-4 text-right font-medium">At-Risk ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Health</th>
              <th className="py-3 pr-4 text-right font-medium">Critical Customers</th>
              <th className="py-3 text-right font-medium">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((sector) => (
              <tr className="border-b last:border-0" key={sector.sector}>
                <td className="py-3 pr-4 font-medium text-gray-900">{sector.sector}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(sector.arr)}</td>
                <td className="py-3 pr-4 text-right">{formatUSD(sector.atRiskARR)}</td>
                <td className="py-3 pr-4 text-right">{sector.healthScore.toFixed(0)}%</td>
                <td className="py-3 pr-4 text-right">{sector.criticalCustomers}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${riskLevelClass(sector.riskLevel)}`}>
                    {sector.riskLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Commercial Risk Signals" subtitle="Auto-generated commercial risk signals from account, country, and sector data.">
        <div className="space-y-3">
          {riskSignals.map((signal) => (
            <div className={`rounded-lg border p-3 text-sm font-medium ${signalClass(signal.tone)}`} key={signal.message}>
              {signal.message}
            </div>
          ))}
        </div>
      </Section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0A9599]">Executive Risk Summary</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Highest Risk Country" value={executiveSummary.highestRiskCountry?.country ?? "Not available"} />
          <SummaryMetric label="Highest Risk Sector" value={executiveSummary.highestRiskSector?.sector ?? "Not available"} />
          <SummaryMetric label="Highest Risk Customer" value={tenantName(executiveSummary.highestRiskCustomer ?? {})} />
          <SummaryMetric label="Total Revenue At Risk" value={formatUSD(executiveSummary.totalRevenueAtRisk)} />
        </div>
        <p className="mt-5 text-sm text-gray-700">{executiveSummary.recommendation}</p>
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

function Section({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Table({ children, minWidth }: { children: React.ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
