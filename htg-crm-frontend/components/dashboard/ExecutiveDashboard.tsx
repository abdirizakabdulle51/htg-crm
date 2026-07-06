"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Target } from "lucide-react";

import { AIGrowthOpportunities } from "@/components/dashboard/AIGrowthOpportunities";
import { ChurnRiskSummary } from "@/components/dashboard/ChurnRiskSummary";
import { CompanyKPIBar } from "@/components/dashboard/CompanyKPIBar";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { PipelineHeatmap } from "@/components/dashboard/PipelineHeatmap";
import { RevenueByCountryChart } from "@/components/dashboard/RevenueByCountryChart";
import { RevenueBySectoChart } from "@/components/dashboard/RevenueBySectoChart";
import SetTargetsModal from "@/components/dashboard/SetTargetsModal";
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
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type TargetsApiResponse = {
  targets?: Array<{
    country?: string | null;
    account_manager_id?: string | null;
    target_arr_usd: number;
  }>;
};

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

export function ExecutiveDashboard() {
  const { data: session, status } = useSession();
  const token = typeof session?.accessToken === "string" ? session.accessToken : "";
  const authedFetcher = async <T,>(url: string): Promise<T> => {
    const response = await fetch(`${API}${url}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = (await response.json()) as ApiEnvelope<T>;
    if (!response.ok || body.error) {
      console.error("authenticated fetch failed", url, response.status, body.error);
      throw new Error(body.error?.message ?? `Request failed: ${response.status}`);
    }
    return body.data as T;
  };
  const [showTargets, setShowTargets] = useState(false);
  const [q3Target, setQ3Target] = useState(0);
  const [countryTargets, setCountryTargets] = useState<Record<string, number>>({});
  const quarter = 3;
  const year = 2026;
  const { data: pipeline } = useSWR<PipelineOverview>(
    status === "authenticated" && token ? "/api/v1/pipeline" : null,
    authedFetcher,
    {
      refreshInterval: 60000,
    },
  );
  const { data: teamHealth } = useSWR<TeamTargetsResponse>(
    status === "authenticated" && token ? "/api/v1/targets/team" : null,
    authedFetcher,
    {
      refreshInterval: 120000,
    },
  );
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

  useEffect(() => {
    if (status === "loading") return;

    const token = (session as any)?.accessToken ?? "";
    if (!token) {
      console.error("targets fetch skipped: missing access token");
      return;
    }

    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`${API}/api/v1/targets?quarter=3&year=2026`, { headers, credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          console.error("targets fetch failed", r.status);
          return null;
        }
        return r.json();
      })
      .then((data: TargetsApiResponse | null) => {
        if (!data) return;
        const countryTargets = (data.targets ?? []).filter((t: any) => !t.account_manager_id);
        const total = countryTargets.reduce((sum: number, t: any) => sum + t.target_arr_usd, 0);
        setQ3Target(total);

        const byCountry: Record<string, number> = {};
        for (const t of countryTargets) {
          if (t.country) byCountry[t.country] = t.target_arr_usd;
        }
        setCountryTargets(byCountry);
      })
      .catch((e) => console.error("targets fetch error", e));
  }, [session, status]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 flex justify-end">
        <button
          onClick={() => setShowTargets(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
        >
          <Target className="h-4 w-4" /> Set Targets
        </button>
      </div>

      <div className="col-span-12">
        <CompanyKPIBar
          atRisk={atRisk}
          forecast={forecast}
          pipeline={pipeline}
          q3Target={q3Target}
          team={teamHealth?.team}
          tenants={tenants}
        />
      </div>

      <div className="col-span-12 h-80 xl:col-span-6">
        <RevenueByCountryChart
          countries={pipeline?.by_country}
          countryTargets={countryTargets}
          team={teamHealth?.team}
          tenants={tenants}
        />
      </div>
      <div className="col-span-12 h-80 xl:col-span-6">
        <RevenueBySectoChart sectors={pipeline?.by_sector} tenants={tenants} />
      </div>

      <div className="col-span-12 h-96 xl:col-span-5">
        <TeamLeaderboard countries={pipeline?.by_country} team={teamHealth?.team} />
      </div>
      <div className="col-span-12 h-96 xl:col-span-4">
        <ForecastWidget forecast={forecast} targetUsd={q3Target} />
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

      <SetTargetsModal open={showTargets} onClose={() => setShowTargets(false)} />
    </div>
  );
}
