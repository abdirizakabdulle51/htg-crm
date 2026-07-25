"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, BriefcaseBusiness, CalendarClock, CheckSquare, Target, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const MY_TARGET = 1200000;

const tasks: Array<{ title: string; due: string; priority: string }> = [];

const STAGE_LABELS: Record<number, string> = {
  1: "New Lead",
  2: "Qualified",
  3: "Discovery",
  4: "Solution Fit",
  5: "Proposal",
  6: "Negotiation",
  7: "Procurement",
  8: "Contracting",
  9: "Won",
  10: "Lost",
  11: "Dormant",
};

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

type LeadRow = {
  id?: string;
  name?: string;
  opportunity_name?: string;
  title?: string;
  company_name?: string;
  companyName?: string;
  customer?: string;
  tenant_name?: string;
  country?: string;
  country_name?: string;
  country_id?: string;
  countryId?: string;
  stage?: string | number;
  stage_name?: string;
  stage_number?: number;
  status?: string;
  value?: number;
  value_usd?: number;
  valueUsd?: number;
  potential_value_usd?: number;
  estimated_value?: number;
  deal_value?: number;
  amount?: number;
  probability?: number;
  win_probability?: number;
  probability_percent?: number;
  owner?: string;
  owner_name?: string;
  ownerName?: string;
  owner_id?: string;
  assigned_to?: string;
  assignedTo?: string;
  account_manager?: string;
  accountManager?: string;
  account_manager_name?: string;
  account_manager_id?: string;
};

type LeadsResponse = LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] };

type NormalizedOpportunity = {
  id: string;
  hasStableId: boolean;
  name: string;
  customer: string;
  country: string;
  stage: string;
  value: number;
  probability: number;
  owner: string;
};

type DashboardAction = {
  id: string;
  title: string;
  href: string;
};

type TenantWithExtras = Tenant & {
  owner?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  account_manager?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  tenant_country?: string | null;
  health_score?: number | null;
  healthScore?: number | null;
  riskScore?: number | null;
};

function unwrapList<T>(value: T[] | { items?: T[]; tenants?: T[]; leads?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.tenants ?? value?.leads ?? [];
}

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

function apiErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load dashboard data. Please try again.";
}

function tenantARR(tenant: TenantWithExtras) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantRenewalDate(tenant: TenantWithExtras) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function tenantSector(tenant: TenantWithExtras) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantCountry(tenant: TenantWithExtras) {
  return tenant.country ?? tenant.country_name ?? tenant.countryName ?? tenant.tenant_country ?? "";
}

function tenantHealthScore(tenant: TenantWithExtras) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - tenantRiskScore(tenant));
}

function tenantRiskScore(tenant: TenantWithExtras) {
  const score = tenant.risk_score ?? tenant.riskScore;
  const health = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number" && score > 0) return score <= 1 ? score * 100 : score;
  if (typeof health === "number" && health > 0 && health <= 1) return (1 - health) * 100;
  if (typeof score === "number") return score;
  return 0;
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

function opportunityStage(lead: LeadRow) {
  const stageText = String(lead.stage_name ?? lead.stage ?? lead.status ?? "").toLowerCase();
  const stageNumber = lead.stage_number ?? (typeof lead.stage === "number" ? lead.stage : undefined);
  if (stageNumber && STAGE_LABELS[stageNumber]) return STAGE_LABELS[stageNumber];
  if (stageText.includes("won") || stageNumber === 9) return "Won";
  if (stageText.includes("lost") || stageNumber === 10) return "Lost";
  if (stageText.includes("dormant") || stageNumber === 11) return "Dormant";
  if (stageText.includes("contract")) return "Contracting";
  if (stageText.includes("procurement")) return "Procurement";
  if (stageText.includes("negotiation")) return "Negotiation";
  if (stageText.includes("proposal") || (stageNumber ?? 0) >= 5) return "Proposal";
  if (stageText.includes("qualified") || (stageNumber ?? 0) >= 3) return "Qualified";
  return "Prospect";
}

function opportunityProbability(lead: LeadRow, stage: string) {
  const provided = lead.probability ?? lead.win_probability ?? lead.probability_percent;
  if (typeof provided === "number") return provided <= 1 ? provided * 100 : provided;

  if (stage === "Negotiation") return 75;
  if (stage === "Proposal") return 60;
  if (stage === "Qualified") return 35;
  if (stage === "Won") return 100;
  if (stage === "Lost") return 0;
  return 20;
}

function opportunityValue(lead: LeadRow) {
  return lead.value ?? lead.value_usd ?? lead.valueUsd ?? lead.potential_value_usd ?? lead.estimated_value ?? lead.deal_value ?? lead.amount ?? 0;
}

function opportunityCountry(lead: LeadRow, countriesByID: Map<string, string>) {
  const countryId = lead.country_id ?? lead.countryId ?? "";
  return lead.country ?? lead.country_name ?? (countryId ? countriesByID.get(countryId) ?? COUNTRY_BY_ID[countryId] : undefined) ?? "—";
}

function normalizeOpportunity(lead: LeadRow, index: number, countriesByID: Map<string, string>): NormalizedOpportunity {
  const stage = opportunityStage(lead);
  const hasStableId = Boolean(lead.id);

  return {
    id: lead.id ?? `${lead.name ?? lead.company_name ?? "opportunity"}-${index}`,
    hasStableId,
    name: lead.name ?? lead.opportunity_name ?? lead.title ?? lead.company_name ?? "Unnamed opportunity",
    customer: lead.company_name ?? lead.companyName ?? lead.customer ?? lead.tenant_name ?? lead.name ?? "Unassigned customer",
    country: opportunityCountry(lead, countriesByID),
    stage,
    value: opportunityValue(lead),
    probability: opportunityProbability(lead, stage),
    owner: lead.owner_name ?? lead.ownerName ?? lead.account_manager_name ?? lead.owner ?? lead.owner_id ?? "Account Manager",
  };
}

function nextActionForStage(stage: string) {
  if (stage === "Negotiation" || stage === "Procurement" || stage === "Contracting") return "Close plan";
  if (stage === "Proposal") return "Follow up proposal";
  if (stage === "Qualified") return "Schedule discovery";
  if (stage === "Prospect") return "Qualify need";
  if (stage === "Won") return "Handover";
  if (stage === "Lost") return "Review loss";
  return "Update next step";
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-500 text-white";
  if (priority === "Medium") return "bg-amber-500 text-white";
  return "bg-green-500 text-white";
}

function attentionAction(tenant: TenantWithExtras, days: number | null) {
  if (tenantRiskScore(tenant) > 50) return "Schedule retention call";
  if (days !== null && days <= 90) return "Prepare renewal plan";
  return "Customer success review";
}

function opportunityHref(opportunity: NormalizedOpportunity | undefined, action?: string) {
  if (!opportunity?.hasStableId) return "/am/opportunities";
  const params = new URLSearchParams({ opportunity: opportunity.id });
  if (action) params.set("action", action);
  return `/am/opportunities?${params.toString()}`;
}

function customerHref(tenant: TenantWithExtras | undefined, action?: string) {
  if (!tenant?.id) return "/am/customers";
  const params = new URLSearchParams({ customer: tenant.id });
  if (action) params.set("action", action);
  return `/am/customers?${params.toString()}`;
}

function renewalHref(tenant: TenantWithExtras | undefined, action?: string) {
  if (!tenant?.id) return "/am/renewals";
  const params = new URLSearchParams({ tenant: tenant.id });
  if (action) params.set("action", action);
  return `/am/renewals?${params.toString()}`;
}

export default function AMPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);
  const [leadsData, setLeadsData] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  // Temporary UI-only completion until Activities/Tasks persistence is connected.
  const [completedPriorities, setCompletedPriorities] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const amName =
    (session as { user?: { name?: string | null } } | null)?.user?.name ??
    (session as { name?: string | null } | null)?.name ??
    "Account Manager";
  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function loadAMData() {
      setLoading(true);
      setLoadError("");
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const [tenantsResponse, leadsResponse] = await Promise.all([
          fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>("/api/v1/tenants", token),
          fetchJson<LeadsResponse>("/api/v1/leads", token),
        ]);

        if (cancelled) return;

        setTenantsData(unwrapList<TenantWithExtras>(tenantsResponse));
        setLeadsData(unwrapList<LeadRow>(leadsResponse));
      } catch (error) {
        console.error("AM dashboard fetch failed", error);
        if (!cancelled) {
          setTenantsData([]);
          setLeadsData([]);
          setLoadError(apiErrorMessage(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAMData();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const myCustomers = tenantsData;
  const rawOpportunities = leadsData;
  const countriesByID = useMemo(() => {
    const countries = new Map<string, string>();
    myCustomers.forEach((tenant) => {
      const country = tenantCountry(tenant);
      if (tenant.country_id && country) countries.set(tenant.country_id, country);
    });
    Object.entries(COUNTRY_BY_ID).forEach(([id, name]) => countries.set(id, name));
    return countries;
  }, [myCustomers]);
  const opportunities = useMemo(() => rawOpportunities.map((lead, index) => normalizeOpportunity(lead, index, countriesByID)), [rawOpportunities, countriesByID]);

  const myARR = myCustomers.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const achievement = MY_TARGET > 0 ? (myARR / MY_TARGET) * 100 : 0;
  const openOpportunities = opportunities.filter((opportunity) => !["Won", "Lost", "Dormant"].includes(opportunity.stage));
  const myPipeline = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const atRiskCustomers = myCustomers.filter((tenant) => tenantRiskScore(tenant) > 50);
  const renewalRows = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
    .filter((row): row is { tenant: TenantWithExtras; days: number } => row.days !== null && row.days >= 0)
    .sort((a, b) => a.days - b.days);
  const renewalsDue = renewalRows.filter((row) => row.days <= 90);
  const attentionCustomers = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)), health: tenantHealthScore(tenant) }))
    .filter((row) => tenantRiskScore(row.tenant) > 50 || (row.days !== null && row.days <= 90 && row.days >= 0) || row.health < 70)
    .sort((a, b) => tenantRiskScore(b.tenant) - tenantRiskScore(a.tenant));
  const highestValueOpportunity = [...openOpportunities].sort((a, b) => b.value - a.value)[0];
  const highestRiskCustomer = [...atRiskCustomers].sort((a, b) => tenantRiskScore(b) - tenantRiskScore(a))[0];
  const nextRenewal = renewalsDue[0];

  const priorities: DashboardAction[] = [
    ...renewalsDue
      .filter((row) => row.days <= 30)
      .slice(0, 2)
      .map((row) => ({
        id: `renewal-${row.tenant.id}`,
        title: `Renewal due: ${row.tenant.name} in ${row.days} days`,
        href: renewalHref(row.tenant, "renewal-review"),
      })),
    ...atRiskCustomers.slice(0, 2).map((tenant) => ({
      id: `risk-${tenant.id}`,
      title: `Call ${tenant.name} - risk score ${tenantRiskScore(tenant).toFixed(0)}`,
      href: customerHref(tenant, "review-risk"),
    })),
    ...openOpportunities
      .filter((opportunity) => opportunity.value >= 200000)
      .slice(0, 2)
      .map((opportunity) => ({
        id: `follow-${opportunity.id}`,
        title: `Follow up on ${opportunity.name} worth ${formatUSD(opportunity.value)}`,
        href: opportunityHref(opportunity, "follow-up"),
      })),
    ...openOpportunities
      .filter((opportunity) => ["Proposal", "Negotiation"].includes(opportunity.stage))
      .slice(0, 2)
      .map((opportunity) => ({
        id: `move-${opportunity.id}`,
        title: `Move ${opportunity.name} forward`,
        href: opportunityHref(opportunity),
      })),
  ].slice(0, 7);
  const visiblePriorities = priorities.filter((priority) => !completedPriorities.has(priority.id));
  const visibleTasks = tasks.filter((task) => !completedTasks.has(task.title));

  const coachRecommendation =
    highestValueOpportunity && nextRenewal
      ? `Focus today on closing ${highestValueOpportunity.name} and preparing the ${nextRenewal.tenant.name} renewal plan.`
      : highestRiskCustomer
        ? `Start today with a retention call for ${highestRiskCustomer.name}, then update opportunity next steps.`
        : highestValueOpportunity
          ? `Focus today on moving ${highestValueOpportunity.name} to the next stage.`
          : "Start with customer follow-ups and keep opportunity stages current before end of day.";

  if (status === "loading") {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  if (!session) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Users} label="My ARR" value={formatUSD(myARR)} />
        <KpiCard icon={Target} label="My Target" value={formatUSD(MY_TARGET)} />
        <KpiCard icon={TrendingUp} label="Achievement" value={`${achievement.toFixed(1)}%`} />
        <KpiCard href="/am/opportunities" icon={BriefcaseBusiness} label="My Pipeline" value={formatUSD(myPipeline)} />
        <KpiCard href="/am/opportunities?status=open" icon={TrendingUp} label="Open Opportunities" value={openOpportunities.length.toString()} />
        <KpiCard href="/am/renewals" icon={CalendarClock} label="Renewals Due" value={renewalsDue.length.toString()} />
        <KpiCard href="/am/tasks" icon={CheckSquare} label="Open Tasks" value={visibleTasks.length.toString()} />
        <KpiCard href="/am/customers?filter=at-risk" icon={AlertTriangle} label="At-Risk Customers" value={atRiskCustomers.length.toString()} />
      </div>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Today&apos;s Priorities</CardTitle>
          <p className="text-sm text-gray-500">Execution list for {amName}.</p>
        </CardHeader>
        <CardContent>
          {loadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {visiblePriorities.map((priority) => (
              <div
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[#0A9599]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
                key={priority.id}
                onClick={() => router.push(priority.href)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(priority.href);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <input
                  aria-label={`Mark complete: ${priority.title}`}
                  className="mt-1 h-4 w-4 accent-[#0A9599]"
                  onChange={() =>
                    setCompletedPriorities((current) => {
                      const next = new Set(current);
                      next.add(priority.id);
                      return next;
                    })
                  }
                  onClick={(event) => event.stopPropagation()}
                  type="checkbox"
                />
                <span className="text-sm font-medium text-gray-800">{priority.title}</span>
              </div>
            ))}
          </div>
          {!visiblePriorities.length && <p className="py-6 text-sm text-gray-500">{loadError ? "Dashboard data could not be loaded." : "No live priorities right now."}</p>}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>My Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-medium">Opportunity</th>
                  <th className="py-3 pr-4 font-medium">Customer / Country</th>
                  <th className="py-3 pr-4 font-medium">Stage</th>
                  <th className="py-3 pr-4 text-right font-medium">Value</th>
                  <th className="py-3 pr-4 text-right font-medium">Probability</th>
                  <th className="py-3 pr-4 text-right font-medium">Weighted Value</th>
                  <th className="py-3 font-medium">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <tr
                    className="cursor-pointer border-b transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-inset last:border-0"
                    key={opportunity.id}
                    onClick={() => router.push(opportunityHref(opportunity))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(opportunityHref(opportunity));
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="py-3 pr-4 font-medium">{opportunity.name}</td>
                    <td className="py-3 pr-4 text-gray-500">
                      {opportunity.customer} / {opportunity.country}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className="bg-[#0A9599] text-white">{opportunity.stage}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                    <td className="py-3 pr-4 text-right">{opportunity.probability.toFixed(0)}%</td>
                    <td className="py-3 pr-4 text-right font-semibold">
                      {formatUSD(opportunity.value * (opportunity.probability / 100))}
                    </td>
                    <td className="py-3">{nextActionForStage(opportunity.stage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!opportunities.length && <p className="py-6 text-sm text-gray-500">No opportunities assigned yet.</p>}
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Customers Needing Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-medium">Customer</th>
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 text-right font-medium">Health</th>
                  <th className="py-3 pr-4 text-right font-medium">Risk</th>
                  <th className="py-3 pr-4 font-medium">Renewal</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionCustomers.map(({ tenant, days, health }) => (
                  <tr
                    className="cursor-pointer border-b transition hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-inset last:border-0"
                    key={tenant.id}
                    onClick={() => router.push(customerHref(tenant))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(customerHref(tenant));
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenantCountry(tenant) || "Unassigned"}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-3 pr-4 text-right">{health.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-right">
                      <Badge className={tenantRiskScore(tenant) > 50 ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>
                        {tenantRiskScore(tenant).toFixed(0)}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                    <td className="py-3">{attentionAction(tenant, days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!attentionCustomers.length && (
            <p className="py-6 text-sm text-gray-500">{loading ? "Loading customers..." : "No customers need immediate attention."}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Upcoming Renewals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4 font-medium">Customer</th>
                    <th className="py-3 pr-4 text-right font-medium">ARR</th>
                    <th className="py-3 pr-4 font-medium">Renewal Date</th>
                    <th className="py-3 pr-4 text-right font-medium">Days Remaining</th>
                    <th className="py-3 text-right font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {renewalRows.slice(0, 6).map(({ tenant, days }) => {
                    const priority = days < 30 ? "High" : days <= 90 ? "Medium" : "Low";
                    return (
                      <tr
                        className="cursor-pointer border-b transition hover:bg-gray-50 focus-within:bg-gray-50 last:border-0"
                        key={tenant.id}
                        onClick={() => router.push(renewalHref(tenant, "renewal-review"))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(renewalHref(tenant, "renewal-review"));
                          }
                        }}
                        tabIndex={0}
                      >
                        <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                        <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                        <td className="py-3 pr-4 text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                        <td className="py-3 pr-4 text-right">{days}</td>
                        <td className="py-3 text-right">
                          <Badge className={priorityClass(priority)}>{priority}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!renewalRows.length && <p className="py-6 text-sm text-gray-500">No upcoming renewals found.</p>}
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <div
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 transition hover:border-[#0A9599]/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
                  key={task.title}
                  onClick={() => router.push("/am/tasks")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push("/am/tasks");
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    aria-label={`Mark complete: ${task.title}`}
                    className="mt-1 h-4 w-4 accent-[#0A9599]"
                    onChange={() =>
                      setCompletedTasks((current) => {
                        const next = new Set(current);
                        next.add(task.title);
                        return next;
                      })
                    }
                    onClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-gray-800">{task.title}</span>
                    <span className="mt-1 block text-xs text-gray-500">{task.due}</span>
                  </span>
                  <Badge className={priorityClass(task.priority)}>{task.priority}</Badge>
                </div>
              ))}
            </div>
            {!visibleTasks.length && <p className="py-6 text-sm text-gray-500">No live tasks yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#0A9599]">Sales Coach</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-5">
          <CoachMetric label="Target progress" value={`${achievement.toFixed(1)}%`} />
          <CoachMetric href={opportunityHref(highestValueOpportunity)} label="Highest value opportunity" value={highestValueOpportunity ? highestValueOpportunity.name : "No open opportunity"} />
          <CoachMetric href={customerHref(highestRiskCustomer, "review-risk")} label="Highest risk customer" value={highestRiskCustomer ? `${highestRiskCustomer.name} (${tenantRiskScore(highestRiskCustomer).toFixed(0)})` : "No high-risk customer"} />
          <CoachMetric label="Next renewal" value={nextRenewal ? `${nextRenewal.tenant.name} (${nextRenewal.days} days)` : "No renewal due"} />
          <div className="rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm lg:col-span-5">{coachRecommendation}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoachMetric({ href, label, value }: { href?: string; label: string; value: string }) {
  const content = (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      aria-label={`Open ${label}`}
      className="block rounded-lg transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
      href={href}
    >
      {content}
    </Link>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const content = (
    <Card className={`bg-white rounded-lg shadow-sm border border-gray-200 ${href ? "cursor-pointer transition hover:border-[#0A9599]/40 hover:shadow-md" : ""}`}>
      <CardContent className="flex h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{label}</p>
          <Icon className="h-4 w-4 text-[#0A9599]" />
        </div>
        <p className="text-2xl font-semibold tracking-normal text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link
      aria-label={`Open ${label}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A9599] focus-visible:ring-offset-2"
      href={href}
    >
      {content}
    </Link>
  );
}
