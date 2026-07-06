"use client";

import { useMemo } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import { CEOReportPDF, type CEOReportPDFProps } from "@/components/dashboard/CEOReportPDF";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AIRecommendation, RecommendationsResponse, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRIES = ["Kenya", "Ethiopia", "Somalia", "Djibouti"];

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type TargetsApiResponse = {
  targets?: Array<{
    country?: string | null;
    account_manager_id?: string | null;
    target_arr_usd: number;
  }>;
};

type LeadsApiResponse = {
  items?: Lead[];
  leads?: Lead[];
};

type Lead = {
  id: string;
  country_id?: string;
  country?: string;
  stage_number?: number;
  value_usd?: number;
  probability?: number;
  won_date?: string;
  updated_at?: string;
};

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, type: string, content: BlobPart) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isCurrentMonth(dateValue?: string) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function normalizeLeads(response?: LeadsApiResponse | Lead[]) {
  if (Array.isArray(response)) return response;
  return response?.items ?? response?.leads ?? [];
}

function buildRevenueCsv(tenants: Tenant[], leads: Lead[]) {
  const rows = [
    ["Tenant", "Country", "Sector", "Status", "Risk Score", "Monthly Revenue", "ARR"],
    ...tenants.map((tenant) => [
      tenant.name,
      tenant.country ?? "Unassigned",
      tenant.sector ?? tenant.sector_name ?? "Unassigned",
      tenant.status ?? "",
      tenant.risk_score ?? 0,
      tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0,
      tenantARR(tenant),
    ]),
    [],
    ["Lead", "Country ID", "Stage", "Probability", "", "", "Value"],
    ...leads.map((lead) => [
      lead.id,
      lead.country ?? lead.country_id ?? "",
      lead.stage_number ?? 0,
      lead.probability ?? 0,
      "",
      "",
      lead.value_usd ?? 0,
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function insightFromRecommendation(recommendation: AIRecommendation): { title: string; body: string } {
  return {
    title: recommendation.title,
    body: recommendation.message || `${recommendation.recommended_service ?? "Service"} opportunity for ${recommendation.tenant_name ?? "a tenant"}.`,
  };
}

export default function ReportsPage() {
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
  const { data: tenants, isLoading: tenantsLoading } = useSWR<Tenant[]>(
    canFetch ? "/api/v1/tenants?limit=100" : null,
    authedFetcher,
  );
  const { data: targets, isLoading: targetsLoading } = useSWR<TargetsApiResponse>(
    canFetch ? "/api/v1/targets?quarter=3&year=2026" : null,
    authedFetcher,
  );
  const { data: leadsResponse, isLoading: leadsLoading } = useSWR<LeadsApiResponse | Lead[]>(
    canFetch ? "/api/v1/leads?limit=100" : null,
    authedFetcher,
  );
  const { data: recommendations } = useSWR<RecommendationsResponse>(
    canFetch ? "/api/v1/ai/recommendations?type=CROSS_SELL&limit=10" : null,
    authedFetcher,
  );

  const tenantsRows = useMemo(() => tenants ?? [], [tenants]);
  const leads = useMemo(() => normalizeLeads(leadsResponse), [leadsResponse]);
  const isLoading = status === "loading" || tenantsLoading || targetsLoading || leadsLoading;

  const reportData = useMemo<CEOReportPDFProps>(() => {
    const targetRows = (targets?.targets ?? []).filter((target) => !target.account_manager_id);
    const targetByCountry = new Map(
      targetRows
        .filter((target) => target.country)
        .map((target) => [target.country as string, target.target_arr_usd]),
    );
    const countryByID = new Map<string, string>();
    for (const tenant of tenantsRows) {
      if (tenant.country_id && tenant.country) countryByID.set(tenant.country_id, tenant.country);
    }

    const wonLeads = leads.filter((lead) => lead.stage_number === 9);
    const q3Achieved = wonLeads.reduce((sum, lead) => sum + (lead.value_usd ?? 0), 0);
    const pipeline = leads
      .filter((lead) => (lead.stage_number ?? 0) >= 1 && (lead.stage_number ?? 0) <= 9)
      .reduce((sum, lead) => sum + (lead.value_usd ?? 0), 0);
    const wonThisMonth = wonLeads
      .filter((lead) => isCurrentMonth(lead.won_date ?? lead.updated_at))
      .reduce((sum, lead) => sum + (lead.value_usd ?? 0), 0);

    const countries = COUNTRIES.map((country) => {
      const countryTenants = tenantsRows.filter((tenant) => tenant.country === country);
      return {
        name: country,
        arr: countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0),
        target: targetByCountry.get(country) ?? 0,
        tenants: countryTenants.length,
        atRisk: countryTenants.filter((tenant) => (tenant.risk_score ?? 0) >= 60 || tenant.status === "AT_RISK").length,
      };
    }).sort((a, b) => b.arr - a.arr);

    const atRiskTenants = tenantsRows
      .filter((tenant) => (tenant.risk_score ?? 0) >= 60 || tenant.status === "AT_RISK")
      .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
      .slice(0, 8)
      .map((tenant) => ({
        name: tenant.name,
        country: tenant.country ?? (tenant.country_id ? countryByID.get(tenant.country_id) : undefined) ?? "Unassigned",
        sector: tenant.sector ?? tenant.sector_name ?? "Unassigned",
        riskScore: tenant.risk_score ?? 0,
        arr: tenantARR(tenant),
      }));

    const insights = (recommendations?.recommendations ?? []).slice(0, 3).map(insightFromRecommendation);

    return {
      totalARR: tenantsRows.reduce((sum, tenant) => sum + tenantARR(tenant), 0),
      q3Target: targetRows.reduce((sum, target) => sum + target.target_arr_usd, 0),
      q3Achieved,
      pipeline,
      wonThisMonth,
      forecast: q3Achieved + pipeline * 0.2,
      activeCount: tenantsRows.filter((tenant) => tenant.status === "ACTIVE").length,
      atRiskCount: atRiskTenants.length,
      countries,
      atRiskTenants,
      insights,
    };
  }, [leads, recommendations?.recommendations, targets?.targets, tenantsRows]);

  const handleExcelDownload = () => {
    downloadBlob("revenue-data.csv", "text/csv;charset=utf-8", buildRevenueCsv(tenantsRows, leads));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
        <p className="text-sm text-muted-foreground">Export the current executive dashboard data for leadership review.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>CEO Summary Report</CardTitle>
            <FileText className="h-5 w-5 text-indigo-600" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Downloads a branded PDF with HTG executive KPIs, country performance, risk exposure, and AI insights.
            </p>
            {isLoading ? (
              <Button className="gap-2" disabled>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing PDF...
              </Button>
            ) : (
              <PDFDownloadLink
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                document={<CEOReportPDF {...reportData} />}
                fileName="HTG_CEO_Summary_Report.pdf"
              >
                {({ loading }) => (
                  <>
                    <Download className="h-4 w-4" />
                    {loading ? "Preparing PDF..." : "Download PDF"}
                  </>
                )}
              </PDFDownloadLink>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Revenue Data</CardTitle>
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Downloads tenant revenue, ARR, risk, and lead values as a spreadsheet-ready CSV file.
            </p>
            <Button className="gap-2" disabled={isLoading || !canFetch} onClick={handleExcelDownload}>
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
