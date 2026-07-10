"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Target } from "lucide-react";

import { ChurnRiskSummary } from "@/components/dashboard/ChurnRiskSummary";
import { CompanyKPIBar } from "@/components/dashboard/CompanyKPIBar";
import { CustomerHealthOverview } from "@/components/dashboard/CustomerHealthOverview";
import { ExecutiveAISummary } from "@/components/dashboard/ExecutiveAISummary";
import { ExecutiveAlerts } from "@/components/dashboard/ExecutiveAlerts";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { PipelineByStage } from "@/components/dashboard/PipelineByStage";
import { PipelineHeatmap } from "@/components/dashboard/PipelineHeatmap";
import { RevenueByCountryChart } from "@/components/dashboard/RevenueByCountryChart";
import { RevenueBySectoChart } from "@/components/dashboard/RevenueBySectoChart";
import { RevenueTrend } from "@/components/dashboard/RevenueTrend";
import SetTargetsModal from "@/components/dashboard/SetTargetsModal";
import { StrategicAccounts } from "@/components/dashboard/StrategicAccounts";
import { StrategicOpportunities, type StrategicOpportunity } from "@/components/dashboard/StrategicOpportunities";
import { buildKeyAccountManagers, TopKeyAccountManagers } from "@/components/dashboard/TopKeyAccountManagers";
import { apiFetch } from "@/lib/api";
import type {
  ForecastResponse,
  PipelineOverview,
  TeamTargetsResponse,
  Tenant,
} from "@/types/crm";

const fetcher = <T,>(url: string) => apiFetch<T>(url);
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type TargetsApiResponse = {
  targets?: TargetRow[];
};

type TargetRow = {
  country?: string | null;
  account_manager_id?: string | null;
  target_arr_usd: number;
};

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type LeadApiItem = {
  id?: string;
  company_name?: string;
  companyName?: string;
  name?: string;
  country?: string;
  value_usd?: number;
  valueUsd?: number;
  potential_value_usd?: number;
};

type LeadsApiResponse = LeadApiItem[] | { leads?: LeadApiItem[]; items?: LeadApiItem[] };

function unwrapLeads(value?: LeadsApiResponse | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.leads ?? value.items ?? [];
}

function leadValue(lead: LeadApiItem) {
  return lead.value_usd ?? lead.valueUsd ?? lead.potential_value_usd ?? 0;
}

function leadName(lead: LeadApiItem) {
  return lead.company_name ?? lead.companyName ?? lead.name ?? "Strategic opportunity";
}

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
  const leadsFetcher = async (url: string): Promise<LeadsApiResponse | null> => {
    const response = await fetch(`${API}${url}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiEnvelope<LeadsApiResponse> | LeadsApiResponse;
    if (body && typeof body === "object" && "data" in body) {
      return body.data;
    }

    return body as LeadsApiResponse;
  };
  const [showTargets, setShowTargets] = useState(false);
  const [q3Target, setQ3Target] = useState(0);
  const [countryTargets, setCountryTargets] = useState<Record<string, number>>({});
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
  useSWR("/api/v1/tenants/renewals?days=90", fetcher);
  const { data: tenants } = useSWR<Tenant[]>("/api/v1/tenants?limit=100", fetcher, {
    refreshInterval: 120000,
  });
  const { data: leads } = useSWR<LeadsApiResponse | null>(
    status === "authenticated" && token ? "/api/v1/leads" : null,
    leadsFetcher,
    {
      refreshInterval: 120000,
    },
  );

  const q3Achieved = (teamHealth?.team ?? []).reduce((sum, member) => sum + (member.achieved_usd ?? 0), 0);
  const keyAccountManagers = buildKeyAccountManagers({ countryTargets, pipeline, tenants });
  const topAccountManager = keyAccountManagers[0] ?? null;
  const strategicOpportunities: StrategicOpportunity[] | null = leads
    ? unwrapLeads(leads)
        .map((lead) => ({
          name: leadName(lead),
          value: leadValue(lead),
          country: lead.country ?? "Country pending",
        }))
        .filter((lead) => lead.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 4)
    : null;

  useEffect(() => {
    if (status === "loading") return;

    const token = typeof session?.accessToken === "string" ? session.accessToken : "";
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
        const countryTargets = (data.targets ?? []).filter((t) => !t.account_manager_id);
        const total = countryTargets.reduce((sum, t) => sum + t.target_arr_usd, 0);
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

      <div className="col-span-12">
        <ExecutiveAlerts countryTargets={countryTargets} tenants={tenants} />
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

      <div className="col-span-12">
        <TopKeyAccountManagers managers={keyAccountManagers} />
      </div>

      <div className="col-span-12 h-80">
        <RevenueTrend tenants={tenants} />
      </div>

      <div className="col-span-12">
        <StrategicAccounts tenants={tenants} />
      </div>

      <div className="col-span-12 h-56">
        <CustomerHealthOverview tenants={tenants} />
      </div>

      <div className="col-span-12 h-96 xl:col-span-7">
        <ExecutiveAISummary
          countryTargets={countryTargets}
          q3Achieved={q3Achieved}
          q3Target={q3Target}
          tenants={tenants}
          topAccountManager={topAccountManager}
        />
      </div>
      <div className="col-span-12 h-96 xl:col-span-5">
        <ForecastWidget forecast={forecast} targetUsd={q3Target} />
      </div>

      <div className="col-span-12">
        <StrategicOpportunities opportunities={strategicOpportunities} />
      </div>

      <div className="col-span-12 h-96 xl:col-span-8">
        <PipelineHeatmap pipeline={pipeline} />
      </div>
      <div className="col-span-12 h-96 xl:col-span-4">
        <ChurnRiskSummary team={teamHealth?.team} tenants={atRisk} />
      </div>

      <div className="col-span-12">
        <PipelineByStage pipeline={pipeline} />
      </div>

      <SetTargetsModal open={showTargets} onClose={() => setShowTargets(false)} />
    </div>
  );
}
