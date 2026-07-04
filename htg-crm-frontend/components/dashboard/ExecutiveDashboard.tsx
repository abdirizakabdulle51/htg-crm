"use client";

import useSWR from "swr";

import { AIGrowthOpportunities } from "@/components/dashboard/AIGrowthOpportunities";
import { ChurnRiskSummary } from "@/components/dashboard/ChurnRiskSummary";
import { CompanyKPIBar } from "@/components/dashboard/CompanyKPIBar";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { PipelineHeatmap } from "@/components/dashboard/PipelineHeatmap";
import { RevenueByCountryChart } from "@/components/dashboard/RevenueByCountryChart";
import { RevenueBySectoChart } from "@/components/dashboard/RevenueBySectoChart";
import { TeamLeaderboard } from "@/components/dashboard/TeamLeaderboard";
import { apiFetch } from "@/lib/api";
import type {
  ForecastResponse,
  PipelineOverview,
  RecommendationsResponse,
  TeamTargetsResponse,
  Tenant,
} from "@/types/crm";

const fetcher = <T,>(url: string) => apiFetch<T>(url);

export function ExecutiveDashboard() {
  const { data: pipeline } = useSWR<PipelineOverview>("/api/v1/pipeline/overview", fetcher, {
    refreshInterval: 60000,
  });
  const { data: teamHealth } = useSWR<TeamTargetsResponse>("/api/v1/targets/team", fetcher, {
    refreshInterval: 120000,
  });
  const { data: forecast } = useSWR<ForecastResponse>("/api/v1/ai/forecast?scope=year", fetcher, {
    refreshInterval: 180000,
  });
  const { data: atRisk } = useSWR<Tenant[]>("/api/v1/tenants/at-risk", fetcher, {
    refreshInterval: 120000,
  });
  const { data: recs } = useSWR<RecommendationsResponse>(
    "/api/v1/ai/recommendations?type=CROSS_SELL&limit=10",
    fetcher,
    { refreshInterval: 180000 },
  );
  useSWR("/api/v1/tenants/renewals?days=90", fetcher);
  const { data: tenants } = useSWR<Tenant[]>("/api/v1/tenants?limit=100", fetcher, {
    refreshInterval: 120000,
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <CompanyKPIBar
          atRisk={atRisk}
          forecast={forecast}
          pipeline={pipeline}
          team={teamHealth?.team}
          tenants={tenants}
        />
      </div>

      <div className="col-span-12 h-80 xl:col-span-6">
        <RevenueByCountryChart countries={pipeline?.by_country} team={teamHealth?.team} tenants={tenants} />
      </div>
      <div className="col-span-12 h-80 xl:col-span-6">
        <RevenueBySectoChart sectors={pipeline?.by_sector} tenants={tenants} />
      </div>

      <div className="col-span-12 h-96 xl:col-span-5">
        <TeamLeaderboard countries={pipeline?.by_country} team={teamHealth?.team} />
      </div>
      <div className="col-span-12 h-96 xl:col-span-4">
        <ForecastWidget forecast={forecast} />
      </div>
      <div className="col-span-12 h-96 xl:col-span-3">
        <AIGrowthOpportunities recommendations={recs?.recommendations} />
      </div>

      <div className="col-span-12 h-96 xl:col-span-8">
        <PipelineHeatmap pipeline={pipeline} />
      </div>
      <div className="col-span-12 h-96 xl:col-span-4">
        <ChurnRiskSummary team={teamHealth?.team} tenants={atRisk} />
      </div>
    </div>
  );
}
