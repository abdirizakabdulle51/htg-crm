"use client";

import { useState } from "react";
import useSWR from "swr";

import { AtRiskTenantsTable } from "@/components/dashboard/AtRiskTenantsTable";
import { CountrySummaryBar } from "@/components/dashboard/CountrySummaryBar";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { PipelineFunnelChart } from "@/components/dashboard/PipelineFunnelChart";
import { SectorBreakdownChart } from "@/components/dashboard/SectorBreakdownChart";
import { TeamPerformanceTable } from "@/components/dashboard/TeamPerformanceTable";
import { UpcomingRenewals } from "@/components/dashboard/UpcomingRenewals";
import { apiFetch } from "@/lib/api";
import type { Contract, ForecastResponse, PipelineOverview, TeamTargetsResponse, Tenant } from "@/types/crm";

const fetcher = <T,>(url: string) => apiFetch<T>(url);

export default function CountryManagerPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const { data: teamHealth } = useSWR<TeamTargetsResponse>("/api/v1/targets/team", fetcher, {
    refreshInterval: 120000,
  });
  const { data: pipeline } = useSWR<PipelineOverview>("/api/v1/pipeline/overview", fetcher, {
    refreshInterval: 60000,
  });
  const { data: atRisk } = useSWR<Tenant[]>("/api/v1/tenants/at-risk", fetcher, {
    refreshInterval: 120000,
  });
  const { data: tenants } = useSWR<Tenant[]>("/api/v1/tenants?limit=100", fetcher, {
    refreshInterval: 120000,
  });
  const { data: renewals } = useSWR<Contract[]>("/api/v1/tenants/renewals?days=60", fetcher);
  const { data: forecast } = useSWR<ForecastResponse>("/api/v1/ai/forecast?scope=quarter", fetcher);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <CountrySummaryBar atRisk={atRisk} pipeline={pipeline} team={teamHealth?.team} tenants={tenants} />
      </div>

      <div className="col-span-12 h-[28rem] xl:col-span-8">
        <TeamPerformanceTable owners={pipeline?.by_owner} selectedSector={selectedSector} team={teamHealth?.team} />
      </div>
      <div className="col-span-12 h-[28rem] xl:col-span-4">
        <ForecastWidget forecast={forecast} />
      </div>

      <div className="col-span-12 h-80 xl:col-span-6">
        <PipelineFunnelChart sectors={pipeline?.by_sector} stages={pipeline?.by_stage} />
      </div>
      <div className="col-span-12 h-80 xl:col-span-6">
        <SectorBreakdownChart
          onSelectSector={(_, sectorName) => setSelectedSector(sectorName)}
          sectors={pipeline?.by_sector}
          selectedSector={selectedSector}
        />
      </div>

      <div className="col-span-12 h-72 xl:col-span-6">
        <AtRiskTenantsTable tenants={atRisk} />
      </div>
      <div className="col-span-12 h-72 xl:col-span-6">
        <UpcomingRenewals contracts={renewals} />
      </div>
    </div>
  );
}
