"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { ForecastResponse, PipelineOverview, RecommendationsResponse, TeamTargetsResponse, Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type ReportData = {
  forecast?: ForecastResponse;
  pipeline?: PipelineOverview;
  recommendations?: RecommendationsResponse;
  team?: TeamTargetsResponse;
  tenants?: Tenant[];
};

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
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

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createSimplePdf(lines: string[]) {
  const pageLines = lines.slice(0, 34);
  const text = pageLines.map((line, index) => `BT /F1 11 Tf 48 ${760 - index * 20} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${text.length} >> stream\n${text}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}

function buildSummaryLines(data: ReportData) {
  const tenants = data.tenants ?? [];
  const totalARR = tenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const activeTenants = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
  const atRiskTenants = tenants.filter((tenant) => (tenant.risk_score ?? 0) >= 60 || tenant.status === "AT_RISK").length;
  const q3Achieved = (data.team?.team ?? []).reduce((sum, member) => sum + member.achieved_usd, 0);
  const topRecommendation = data.recommendations?.recommendations?.[0];

  return [
    "HTG CRM CEO Summary Report",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Total ARR: ${formatUSD(totalARR)}`,
    `Active Tenants: ${activeTenants}`,
    `At-Risk Tenants: ${atRiskTenants}`,
    `Q3 Achieved: ${formatUSD(q3Achieved)}`,
    `Pipeline Value: ${formatUSD(data.pipeline?.total_value_usd ?? 0)}`,
    `Won This Month: ${formatUSD(data.pipeline?.won_this_month?.value ?? 0)}`,
    `Forecast: ${formatUSD(data.forecast?.adjusted_forecast_usd ?? 0)}`,
    `Forecast Confidence: ${data.forecast?.confidence ?? "N/A"}`,
    "",
    "Forecast Narrative:",
    data.forecast?.narrative ?? "No forecast narrative available.",
    "",
    "Top Risks:",
    ...(data.forecast?.top_risks ?? ["No forecast risks available."]).slice(0, 3).map((risk) => `- ${risk}`),
    "",
    "Top AI Insight:",
    topRecommendation ? `${topRecommendation.title}: ${topRecommendation.message}` : "No AI insight available.",
  ];
}

function buildRevenueCsv(data: ReportData) {
  const rows = [
    ["Tenant", "Country", "Sector", "Status", "Risk Score", "Monthly Revenue", "ARR"],
    ...(data.tenants ?? []).map((tenant) => [
      tenant.name,
      tenant.country ?? "Unassigned",
      tenant.sector ?? tenant.sector_name ?? "Unassigned",
      tenant.status ?? "",
      tenant.risk_score ?? 0,
      tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0,
      tenantARR(tenant),
    ]),
    [],
    ["Pipeline Total", "", "", "", "", "", data.pipeline?.total_value_usd ?? 0],
    ["Won This Month", "", "", "", "", "", data.pipeline?.won_this_month?.value ?? 0],
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
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
  const { data: pipeline } = useSWR<PipelineOverview>(canFetch ? "/api/v1/pipeline" : null, authedFetcher);
  const { data: tenants } = useSWR<Tenant[]>(canFetch ? "/api/v1/tenants?limit=100" : null, authedFetcher);
  const { data: team } = useSWR<TeamTargetsResponse>(canFetch ? "/api/v1/targets/team" : null, authedFetcher);
  const { data: forecast } = useSWR<ForecastResponse>(canFetch ? "/api/v1/ai/forecast?scope=year" : null, authedFetcher);
  const { data: recommendations } = useSWR<RecommendationsResponse>(
    canFetch ? "/api/v1/ai/recommendations?type=CROSS_SELL&limit=10" : null,
    authedFetcher,
  );

  const reportData = useMemo(
    () => ({ forecast, pipeline, recommendations, team, tenants }),
    [forecast, pipeline, recommendations, team, tenants],
  );

  const handlePdfDownload = () => {
    downloadBlob("ceo-summary-report.pdf", "application/pdf", createSimplePdf(buildSummaryLines(reportData)));
  };

  const handleExcelDownload = () => {
    downloadBlob("revenue-data.csv", "text/csv;charset=utf-8", buildRevenueCsv(reportData));
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
              Downloads a PDF summary with ARR, tenant health, pipeline, forecast, and top AI insight data.
            </p>
            <Button className="gap-2" disabled={!canFetch} onClick={handlePdfDownload}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Revenue Data</CardTitle>
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Downloads tenant revenue, ARR, risk, and pipeline totals as a spreadsheet-ready CSV file.
            </p>
            <Button className="gap-2" disabled={!canFetch} onClick={handleExcelDownload}>
              <Download className="h-4 w-4" />
              Download Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
