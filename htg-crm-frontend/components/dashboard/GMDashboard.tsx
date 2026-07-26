"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, BarChart3, Building2, Target, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const STAGES = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;

const COUNTRY_BY_ID: Record<string, string> = {
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type TargetRow = {
  country?: string | null;
  account_manager_id?: string | null;
  target_arr_usd: number;
};

type TargetsResponse = {
  targets?: TargetRow[];
};

type UserProfile = {
  id: string;
  name?: string;
  role?: string;
  country_office_id?: string;
};

type LeadRow = {
  id?: string;
  name?: string;
  company_name?: string;
  companyName?: string;
  country?: string;
  stage?: string | number;
  stage_number?: number;
  stage_name?: string;
  value?: number;
  value_usd?: number;
  valueUsd?: number;
  potential_value_usd?: number;
  sector?: string;
  sector_name?: string;
  owner?: string;
  owner_name?: string;
  account_manager_name?: string;
  status?: string;
};

type LeadsResponse = LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] };

function unwrapList<T>(value: T[] | { items?: T[]; tenants?: T[]; leads?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.tenants ?? value?.leads ?? [];
}

function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: Tenant) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantRenewalDate(tenant: Tenant) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function tenantHealthScore(tenant: Tenant) {
  const score = (tenant as Tenant & { health_score?: number; healthScore?: number }).health_score ??
    (tenant as Tenant & { health_score?: number; healthScore?: number }).healthScore;

  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;

  const risk = tenant.risk_score ?? 0;
  return Math.max(0, 100 - (risk <= 1 ? risk * 100 : risk));
}

function tenantRiskScore(tenant: Tenant) {
  const source = tenant as Tenant & { health_score?: number; healthScore?: number; riskScore?: number };
  const score = tenant.risk_score ?? source.riskScore;
  const health = source.health_score ?? source.healthScore;
  if (typeof score === "number" && score > 0) return score <= 1 ? score * 100 : score;
  if (typeof health === "number" && health > 0 && health <= 1) return (1 - health) * 100;
  if (typeof score === "number") return score;
  return 0;
}

function riskClass(score: number) {
  if (score > 60) return "bg-red-500 text-white";
  if (score >= 30) return "bg-amber-500 text-white";
  return "bg-green-500 text-white";
}

function statusClass(status?: string) {
  if (status === "ACTIVE") return "bg-green-500 text-white";
  if (status === "AT_RISK") return "bg-red-500 text-white";
  if (status === "PROSPECT") return "bg-blue-500 text-white";
  return "bg-slate-500 text-white";
}

function daysUntil(dateValue: string | null) {
  if (!dateValue) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function leadValue(lead: LeadRow) {
  return lead.value ?? lead.value_usd ?? lead.valueUsd ?? lead.potential_value_usd ?? 0;
}

function leadStage(lead: LeadRow): (typeof STAGES)[number] {
  const stageText = String(lead.stage_name ?? lead.stage ?? "").toLowerCase();
  const stageNumber = lead.stage_number ?? (typeof lead.stage === "number" ? lead.stage : undefined);
  if (stageText.includes("won") || stageNumber === 9) return "Won";
  if (stageText.includes("lost") || stageNumber === 10) return "Lost";
  if (stageText.includes("negotiation") || (stageNumber ?? 0) >= 7) return "Negotiation";
  if (stageText.includes("proposal") || (stageNumber ?? 0) >= 5) return "Proposal";
  if (stageText.includes("qualified") || (stageNumber ?? 0) >= 3) return "Qualified";
  return "Prospect";
}

export function GMDashboard() {
  const { data: session, status } = useSession();
  const [country, setCountry] = useState("");
  const [tenantsData, setTenantsData] = useState<Tenant[]>([]);
  const [targetsData, setTargetsData] = useState<TargetsResponse>({});
  const [leadsData, setLeadsData] = useState<LeadsResponse>([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchJson<T>(url: string, token: string): Promise<T> {
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
    }

    let cancelled = false;

    async function loadDashboardData() {
      setTenantsLoading(true);
      setLoadError("");

      try {
        const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

        if (!token) {
          throw new Error("GM dashboard missing access token");
        }

        const profile = await fetchJson<UserProfile>("/api/v1/me", token);
        const countryName = profile.country_office_id ? COUNTRY_BY_ID[profile.country_office_id] : "";
        if (!countryName) {
          throw new Error("GM profile is missing a country assignment");
        }

        const tenants = await fetchJson<Tenant[] | { tenants?: Tenant[]; items?: Tenant[] }>(
          "/api/v1/tenants",
          token,
        );

        const [targets, leads] = await Promise.all([
          fetchJson<TargetsResponse>("/api/v1/targets?quarter=3&year=2026", token),
          fetchJson<LeadsResponse>("/api/v1/leads", token),
        ]);

        if (cancelled) return;

        setCountry(countryName);
        setTenantsData(unwrapList<Tenant>(tenants));
        setTargetsData(targets ?? {});
        setLeadsData(unwrapList<LeadRow>(leads));
      } catch (error) {
        console.error("GM dashboard fetch failed", error);
        if (!cancelled) {
          setCountry("");
          setTenantsData([]);
          setTargetsData({});
          setLeadsData([]);
          setLoadError(error instanceof Error ? error.message : "Unable to load GM dashboard data.");
        }
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const tenants = useMemo(() => unwrapList<Tenant>(tenantsData), [tenantsData]);
  const countryFromApi =
    tenants.find((tenant) => tenant.country?.toLowerCase() === country.toLowerCase())?.country ?? country;
  const countryTenants = useMemo(
    () => tenants.filter((tenant) => tenant.country === countryFromApi),
    [countryFromApi, tenants],
  );
  const leads = useMemo(() => unwrapList<LeadRow>(leadsData), [leadsData]);

  const countryARR = countryTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const q3Target =
    targetsData?.targets
      ?.find((target) => target.country?.toLowerCase() === country.toLowerCase() && !target.account_manager_id)
      ?.target_arr_usd ?? 0;
  const achievement = q3Target > 0 ? (countryARR / q3Target) * 100 : 0;
  const revenueGap = Math.max(q3Target - countryARR, 0);
  const activeTenants = countryTenants.length;
  const atRiskTenants = countryTenants.filter((tenant) => tenantRiskScore(tenant) > 50).length;

  const topCustomers = useMemo(
    () => [...countryTenants].sort((a, b) => tenantARR(b) - tenantARR(a)).slice(0, 5),
    [countryTenants],
  );
  const sectorRows = useMemo(() => {
    const rows = Array.from(
      countryTenants.reduce((totals, tenant) => {
        const sector = tenantSector(tenant);
        totals.set(sector, (totals.get(sector) ?? 0) + tenantARR(tenant));
        return totals;
      }, new Map<string, number>()),
    );

    return rows
      .map(([sector, arr]) => ({
        sector,
        arr,
        share: countryARR > 0 ? (arr / countryARR) * 100 : 0,
      }))
      .sort((a, b) => b.arr - a.arr);
  }, [countryARR, countryTenants]);
  const atRiskRows = useMemo(
    () => countryTenants.filter((tenant) => tenantRiskScore(tenant) > 50).sort((a, b) => tenantRiskScore(b) - tenantRiskScore(a)),
    [countryTenants],
  );
  const renewalRows = useMemo(
    () =>
      countryTenants
        .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
        .filter((row): row is { tenant: Tenant; days: number } => row.days !== null && row.days >= 0 && row.days <= 90)
        .sort((a, b) => a.days - b.days),
    [countryTenants],
  );
  const urgentRenewals = renewalRows.filter((row) => row.days < 30);
  const averageHealth =
    countryTenants.length > 0
      ? countryTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / countryTenants.length
      : 0;
  const highestRiskTenant = [...countryTenants].sort((a, b) => tenantRiskScore(b) - tenantRiskScore(a))[0];
  const dailyActions = [
    ...atRiskRows.slice(0, 2).map((tenant) => `Follow up with ${tenant.name} - risk score ${tenantRiskScore(tenant).toFixed(0)}`),
    ...urgentRenewals.slice(0, 2).map((row) => `Renewal due: ${row.tenant.name} in ${row.days} days`),
    ...(achievement < 50 ? [`Review Q3 gap with team - ${achievement.toFixed(1)}% achieved`] : []),
    "Review pipeline with Account Managers",
  ].slice(0, 5);
  const coachRecommendation =
    atRiskRows.length > 0
      ? `Prioritize retention actions for ${atRiskRows[0].name}; risk is the weakest country metric.`
      : achievement < 50
        ? "Prioritize Q3 target recovery with account managers and weekly close plans."
        : averageHealth < 70
          ? "Improve account health by scheduling service reviews with lower-scoring tenants."
          : "Country execution is stable; keep focus on renewals and pipeline conversion.";

  const pipelineTotal = leads.reduce((sum, lead) => sum + leadValue(lead), 0);
  const stageCounts = useMemo(
    () =>
      STAGES.map((stage) => ({
        stage,
        count: leads.filter((lead) => leadStage(lead) === stage).length,
      })),
    [leads],
  );

  if (status === "loading" || tenantsLoading) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Country Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Loading country dashboard...</p>
        </div>
      </div>
    );
  }
  if (!session) return null;

  if (loadError || !country) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-normal">Country Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">{loadError || "No country assignment found for this GM."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-normal">Country Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground">{country} Operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={Building2} label="Country ARR" value={formatUSD(countryARR)} />
        <KpiCard icon={Target} label="Q3 Target" value={formatUSD(q3Target)} />
        <KpiCard icon={TrendingUp} label="Achievement" value={`${achievement.toFixed(1)}%`} />
        <KpiCard icon={BarChart3} label="Revenue Gap" value={formatUSD(revenueGap)} />
        <KpiCard icon={Users} label="Active Tenants" value={activeTenants.toString()} />
        <KpiCard icon={AlertTriangle} label="At-Risk Tenants" value={atRiskTenants.toString()} />
      </div>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Pipeline by Sector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sectorRows.map((row) => (
              <div className="rounded-lg border border-gray-200 bg-white p-4" key={row.sector}>
                <p className="text-sm font-medium">{row.sector}</p>
                <p className="mt-3 text-2xl font-semibold">{formatUSD(row.arr)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{row.share.toFixed(1)}% of country ARR</p>
              </div>
            ))}
          </div>
          {!sectorRows.length && <p className="py-6 text-sm text-muted-foreground">No sector revenue data yet.</p>}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>At-Risk Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 text-right font-medium">Risk Score</th>
                  <th className="py-3 pr-4 font-medium">Renewal Date</th>
                  <th className="py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {atRiskRows.map((tenant) => {
                  const risk = tenantRiskScore(tenant);
                  return (
                    <tr className="border-b last:border-0" key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={riskClass(risk)}>{risk.toFixed(0)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(tenantRenewalDate(tenant))}</td>
                      <td className="py-3 text-right">
                        <Badge className={statusClass(tenant.status)}>{tenant.status ?? "UNKNOWN"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!atRiskRows.length && <p className="py-6 text-sm text-muted-foreground">No at-risk accounts - all tenants healthy</p>}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Upcoming Renewals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 font-medium">Renewal Date</th>
                  <th className="py-3 pr-4 text-right font-medium">Days Remaining</th>
                  <th className="py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {renewalRows.map(({ tenant, days }) => (
                  <tr className="border-b last:border-0" key={tenant.id}>
                    <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(tenantRenewalDate(tenant))}</td>
                    <td className="py-3 pr-4 text-right">
                      <Badge className={days < 30 ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>{days} days</Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Badge className={statusClass(tenant.status)}>{tenant.status ?? "UNKNOWN"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!renewalRows.length && <p className="py-6 text-sm text-muted-foreground">No renewals due in the next 90 days</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>GM Daily Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyActions.map((action) => (
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3" key={action}>
                  <span className="mt-1 h-3 w-3 rounded-sm border-2 border-[#0A9599]" />
                  <p className="text-sm">{action}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#0A9599]">Country Coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              <CoachMetric label="Country health score" value={`${averageHealth.toFixed(0)}%`} />
              <CoachMetric label="Q3 achievement" value={`${achievement.toFixed(1)}%`} />
              <CoachMetric
                label="Highest risk tenant"
                value={highestRiskTenant ? `${highestRiskTenant.name} (${tenantRiskScore(highestRiskTenant).toFixed(0)})` : "No tenant risk"}
              />
            </div>
            <div className="rounded-lg border border-[#0A9599]/30 bg-white p-3 text-sm">{coachRecommendation}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Tenant</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 text-right font-medium">Risk Score</th>
                  <th className="py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((tenant) => {
                  const risk = tenantRiskScore(tenant);
                  return (
                    <tr className="border-b last:border-0" key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{tenantSector(tenant)}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={riskClass(risk)}>{risk.toFixed(0)}</Badge>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{tenant.status ?? "UNKNOWN"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!topCustomers.length && (
            <p className="py-6 text-sm text-muted-foreground">
              {tenantsLoading ? `Loading ${country} customers...` : `No ${country} customers found.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Summary</CardTitle>
          <p className="text-sm text-muted-foreground">{formatUSD(pipelineTotal)} total pipeline value</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {stageCounts.map((stage) => (
              <div className="rounded-lg border bg-background p-4" key={stage.stage}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stage.stage}</p>
                <p className="mt-3 text-2xl font-semibold">{stage.count}</p>
              </div>
            ))}
          </div>
          {!leads.length && <p className="mt-4 text-sm text-muted-foreground">No pipeline leads found for {country}.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}
