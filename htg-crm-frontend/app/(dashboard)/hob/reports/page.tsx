"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

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
  "d3ef1714-976e-4048-b0fc-958d84995c9f": "Telecom",
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
};

type AuthSession = {
  accessToken?: string;
};

type ReportCard = {
  title: string;
  description: string;
  format: "CSV" | "PDF";
  disabled?: boolean;
  onDownload?: () => void;
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

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(tenants: TenantRow[]) {
  const headers = ["Country", "Customer", "Sector", "ARR", "MRR", "Health", "Risk", "Renewal", "Status"];
  const rows = tenants.map((tenant) => [
    tenantCountry(tenant),
    tenantName(tenant),
    tenantSector(tenant),
    tenantARR(tenant).toFixed(0),
    tenantMRR(tenant).toFixed(0),
    tenantHealthScore(tenant).toFixed(0),
    tenantRiskScore(tenant).toString(),
    formatDate(tenantRenewalDate(tenant)),
    tenant.status ?? "ACTIVE",
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function downloadCsv(filename: string, tenants: TenantRow[]) {
  const blob = new Blob([toCsv(tenants)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayLabel() {
  return "Today";
}

export default function HOBReportsPage() {
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
        console.error("Failed to load commercial report data", error);
        setTenants([]);
      })
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const countryReportRows = useMemo(
    () => [...tenants].sort((a, b) => tenantCountry(a).localeCompare(tenantCountry(b)) || tenantARR(b) - tenantARR(a)),
    [tenants],
  );

  const strategicAccountRows = useMemo(
    () => [...tenants].sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 10),
    [tenants],
  );

  const sectorReportRows = useMemo(
    () => [...tenants].sort((a, b) => tenantSector(a).localeCompare(tenantSector(b)) || tenantARR(b) - tenantARR(a)),
    [tenants],
  );

  const riskReportRows = useMemo(
    () => tenants.filter((tenant) => tenantRiskScore(tenant) > 50).sort((a, b) => tenantRiskScore(b) - tenantRiskScore(a)),
    [tenants],
  );

  const reportCards = useMemo<ReportCard[]>(
    () => [
      {
        title: "Commercial Performance Report",
        description: "Company ARR, Targets, Pipeline, Sector Performance.",
        format: "PDF",
        disabled: true,
      },
      {
        title: "Country Performance Report",
        description: "Country comparison and GM performance.",
        format: "CSV",
        onDownload: () => downloadCsv("country-performance-report.csv", countryReportRows),
      },
      {
        title: "Strategic Accounts Report",
        description: "Top customers, renewals, and executive attention.",
        format: "CSV",
        onDownload: () => downloadCsv("strategic-accounts-report.csv", strategicAccountRows),
      },
      {
        title: "Sector Performance Report",
        description: "Industry performance and pipeline.",
        format: "CSV",
        onDownload: () => downloadCsv("sector-performance-report.csv", sectorReportRows),
      },
      {
        title: "Commercial Risk Report",
        description: "Risk exposure and recovery plans.",
        format: "CSV",
        onDownload: () => downloadCsv("commercial-risk-report.csv", riskReportRows),
      },
      {
        title: "Commercial Dashboard Snapshot",
        description: "Executive summary for management meetings.",
        format: "PDF",
        disabled: true,
      },
    ],
    [countryReportRows, riskReportRows, sectorReportRows, strategicAccountRows],
  );

  const availableReports = [
    { report: "Commercial Performance", format: "PDF", lastUpdated: todayLabel(), status: "Coming Soon" },
    { report: "Country Performance", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Strategic Accounts", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Sector Performance", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Commercial Risk", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
  ];

  if (status === "loading" || isLoading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Commercial Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate commercial reports, exports, executive summaries, and management analytics.
        </p>
      </section>

      <Section title="Report Library" subtitle="Commercial report downloads and management-ready export templates.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportCards.map((report) => (
            <div className="rounded-lg border border-gray-200 p-5" key={report.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{report.description}</p>
                </div>
                <span className="rounded-full bg-[#0A9599]/10 px-2.5 py-1 text-xs font-semibold text-[#0A9599]">
                  {report.format}
                </span>
              </div>
              <button
                className={`mt-5 rounded-md px-4 py-2 text-sm font-semibold ${
                  report.disabled
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-[#0A9599] text-white hover:bg-[#087b7f]"
                }`}
                disabled={report.disabled}
                onClick={report.onDownload}
                title={report.disabled ? "Coming soon" : undefined}
                type="button"
              >
                {report.format === "PDF" ? "Download PDF" : "Download CSV"}
              </button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Available Reports" subtitle="Current reporting catalog and availability status.">
        <Table minWidth="720px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Report</th>
              <th className="py-3 pr-4 font-medium">Format</th>
              <th className="py-3 pr-4 font-medium">Last Updated</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {availableReports.map((report) => (
              <tr className="border-b last:border-0" key={report.report}>
                <td className="py-3 pr-4 font-medium text-gray-900">{report.report}</td>
                <td className="py-3 pr-4 text-gray-500">{report.format}</td>
                <td className="py-3 pr-4">{report.lastUpdated}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(report.status)}`}>
                    {report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0A9599]">Executive Report Summary</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Total Reports" value="6" />
          <SummaryMetric label="Available Downloads" value="4" />
          <SummaryMetric label="Pending Reports" value="2" />
          <SummaryMetric label="Last Refresh" value={todayLabel()} />
        </div>
        <p className="mt-5 text-sm text-gray-700">
          Generate Country Performance and Strategic Accounts reports before the weekly commercial meeting.
        </p>
      </section>
    </div>
  );
}

function statusClass(status: string) {
  return status === "Available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
