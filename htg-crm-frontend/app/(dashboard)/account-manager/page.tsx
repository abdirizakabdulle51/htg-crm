"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { AICoachCard } from "@/components/dashboard/AICoachCard";
import { CrossSellOpportunities } from "@/components/dashboard/CrossSellOpportunities";
import { OverdueTasks } from "@/components/dashboard/OverdueTasks";
import { PipelineSnapshot } from "@/components/dashboard/PipelineSnapshot";
import { QuarterProgressBar } from "@/components/dashboard/QuarterProgressBar";
import { TargetHealthCard } from "@/components/dashboard/TargetHealthCard";
import { TenantAlertsList } from "@/components/dashboard/TenantAlertsList";
import { UpcomingRenewals } from "@/components/dashboard/UpcomingRenewals";
import { apiFetch } from "@/lib/api";
import type {
  AICoachResponse,
  Contract,
  OverdueActivitiesResponse,
  PipelineOverview,
  RecommendationsResponse,
  TargetHealth,
  TargetsResponse,
  Tenant,
} from "@/types/crm";

const fetcher = <T,>(url: string) => apiFetch<T>(url);

export default function AccountManagerPage() {
  const { data: health } = useSWR<TargetHealth>("/api/v1/targets/health", fetcher, {
    refreshInterval: 60000,
  });
  const { data: coach } = useSWR<AICoachResponse>("/api/v1/ai/coach/daily-brief", fetcher, {
    refreshInterval: 240000,
  });
  const { data: pipeline } = useSWR<PipelineOverview>("/api/v1/pipeline/overview", fetcher, {
    refreshInterval: 60000,
  });
  const { data: alerts } = useSWR<Tenant[]>("/api/v1/tenants/at-risk", fetcher, {
    refreshInterval: 120000,
  });
  const { data: targets } = useSWR<TargetsResponse>("/api/v1/targets/mine", fetcher, {
    refreshInterval: 60000,
  });
  const { data: recs, mutate: refreshRecs } = useSWR<RecommendationsResponse>("/api/v1/ai/recommendations", fetcher);
  const { data: renewals } = useSWR<Contract[]>("/api/v1/tenants/renewals?days=30", fetcher);
  const { data: overdue } = useSWR<OverdueActivitiesResponse>("/api/v1/activities/overdue?limit=10", fetcher, {
    refreshInterval: 60000,
  });

  const currentYearTargets = useMemo(() => {
    const year = new Date().getFullYear();
    return targets?.targets.find((target) => target.year === year) ?? targets?.targets[0];
  }, [targets]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 h-48 xl:col-span-5">
        <TargetHealthCard health={health} />
      </div>
      <div className="col-span-12 h-48 xl:col-span-7">
        <QuarterProgressBar targets={currentYearTargets?.quarters} />
      </div>

      <div className="col-span-12">
        <AICoachCard coaching={coach} />
      </div>

      <div className="col-span-12 h-64 lg:col-span-4">
        <PipelineSnapshot pipeline={pipeline} />
      </div>
      <div className="col-span-12 h-64 lg:col-span-4">
        <TenantAlertsList tenants={alerts} />
      </div>
      <div className="col-span-12 h-64 lg:col-span-4">
        <CrossSellOpportunities onDismissed={() => refreshRecs()} recommendations={recs?.recommendations} />
      </div>

      <div className="col-span-12 h-56 lg:col-span-6">
        <UpcomingRenewals contracts={renewals} />
      </div>
      <div className="col-span-12 h-56 lg:col-span-6">
        <OverdueTasks activities={overdue?.activities} />
      </div>
    </div>
  );
}
