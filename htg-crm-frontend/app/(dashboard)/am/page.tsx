"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { AlertTriangle, BriefcaseBusiness, CalendarClock, CheckSquare, Target, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const MY_TARGET = 1200000;

const mockOpportunities: LeadRow[] = [
  {
    name: "Banking Expansion",
    company_name: "Kenya Tenant 03",
    country: "Kenya",
    stage: "Proposal",
    value: 450000,
    probability: 60,
    owner: "Account Manager",
  },
  {
    name: "Telecom Backup",
    company_name: "Kenya Tenant 01",
    country: "Kenya",
    stage: "Negotiation",
    value: 280000,
    probability: 75,
    owner: "Account Manager",
  },
  {
    name: "Government Cloud",
    company_name: "Kenya Tenant 05",
    country: "Kenya",
    stage: "Qualified",
    value: 220000,
    probability: 35,
    owner: "Account Manager",
  },
  {
    name: "Healthcare DR",
    company_name: "Kenya Tenant 04",
    country: "Kenya",
    stage: "Prospect",
    value: 200000,
    probability: 20,
    owner: "Account Manager",
  },
];

const tasks = [
  { title: "Follow up Banking Expansion proposal", due: "Today", priority: "High" },
  { title: "Schedule renewal call with Kenya Tenant 04", due: "Today", priority: "High" },
  { title: "Update opportunity stages", due: "Tomorrow", priority: "Medium" },
  { title: "Send customer health summary", due: "This week", priority: "Medium" },
];

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
  name: string;
  customer: string;
  country: string;
  stage: string;
  value: number;
  probability: number;
  owner: string;
};

type TenantWithExtras = Tenant & {
  owner?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  account_manager?: string | null;
  health_score?: number | null;
  healthScore?: number | null;
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

function tenantARR(tenant: TenantWithExtras) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantRenewalDate(tenant: TenantWithExtras) {
  return tenant.renewal_date ?? tenant.renewalDate ?? null;
}

function tenantSector(tenant: TenantWithExtras) {
  return tenant.sector ?? tenant.sector_name ?? "Unassigned";
}

function tenantHealthScore(tenant: TenantWithExtras) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function tenantOwnerValue(tenant: TenantWithExtras) {
  return tenant.account_manager_name ?? tenant.account_manager ?? tenant.owner_name ?? tenant.owner ?? tenant.account_manager_id ?? tenant.owner_id ?? "";
}

function leadOwnerValue(lead: LeadRow) {
  return (
    lead.owner_name ??
    lead.ownerName ??
    lead.account_manager_name ??
    lead.owner ??
    lead.assigned_to ??
    lead.assignedTo ??
    lead.account_manager ??
    lead.accountManager ??
    lead.account_manager_id ??
    lead.owner_id ??
    ""
  );
}

function matchesAM(value: string, amName: string, amId: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return false;
  return normalizedValue === amName.toLowerCase() || Boolean(amId && normalizedValue === amId.toLowerCase());
}

function assignedTenants(tenants: TenantWithExtras[], amName: string, amId: string) {
  const hasOwnerData = tenants.some((tenant) => tenantOwnerValue(tenant));
  if (!hasOwnerData) return [];

  return tenants.filter((tenant) => matchesAM(tenantOwnerValue(tenant), amName, amId));
}

function scopedOpportunities(leads: LeadRow[], amName: string, amId: string) {
  const hasOwnerData = leads.some((lead) => leadOwnerValue(lead));
  if (!hasOwnerData) return leads.slice(0, 6);

  const mine = leads.filter((lead) => matchesAM(leadOwnerValue(lead), amName, amId));
  return mine.length ? mine : leads.slice(0, 6);
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
  if (stageText.includes("won") || stageNumber === 9) return "Won";
  if (stageText.includes("lost") || stageNumber === 10) return "Lost";
  if (stageText.includes("negotiation") || (stageNumber ?? 0) >= 7) return "Negotiation";
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

function normalizeOpportunity(lead: LeadRow, index: number): NormalizedOpportunity {
  const stage = opportunityStage(lead);

  return {
    id: lead.id ?? `${lead.name ?? lead.company_name ?? "opportunity"}-${index}`,
    name: lead.name ?? lead.opportunity_name ?? lead.title ?? lead.company_name ?? "Unnamed opportunity",
    customer: lead.company_name ?? lead.companyName ?? lead.customer ?? lead.tenant_name ?? lead.name ?? "Unassigned customer",
    country: lead.country ?? lead.country_name ?? "Unassigned",
    stage,
    value: opportunityValue(lead),
    probability: opportunityProbability(lead, stage),
    owner: leadOwnerValue(lead) || "Account Manager",
  };
}

function nextActionForStage(stage: string) {
  if (stage === "Negotiation") return "Close plan";
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
  if ((tenant.risk_score ?? 0) > 50) return "Schedule retention call";
  if (days !== null && days <= 90) return "Prepare renewal plan";
  return "Customer success review";
}

export default function AMPage() {
  const { data: session, status } = useSession();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);
  const [leadsData, setLeadsData] = useState<LeadRow[]>([]);
  const [leadsFallback, setLeadsFallback] = useState(false);
  const [loading, setLoading] = useState(false);

  const amName =
    (session as { user?: { name?: string | null } } | null)?.user?.name ??
    (session as { name?: string | null } | null)?.name ??
    "Account Manager";
  const amId =
    (session as { user?: { id?: string | null } } | null)?.user?.id ??
    (session as { id?: string | null } | null)?.id ??
    "";

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function loadAMData() {
      setLoading(true);
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const [tenantsResponse, leadsResponse] = await Promise.allSettled([
          fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>("/api/v1/tenants", token),
          fetchJson<LeadsResponse>("/api/v1/leads", token),
        ]);

        if (cancelled) return;

        if (tenantsResponse.status === "fulfilled") {
          setTenantsData(unwrapList<TenantWithExtras>(tenantsResponse.value));
        } else {
          console.error("AM tenants fetch failed", tenantsResponse.reason);
          setTenantsData([]);
        }

        if (leadsResponse.status === "fulfilled") {
          const leads = unwrapList<LeadRow>(leadsResponse.value);
          setLeadsData(leads.length ? leads : mockOpportunities);
          setLeadsFallback(leads.length === 0);
        } else {
          console.error("AM leads fetch failed", leadsResponse.reason);
          setLeadsData(mockOpportunities);
          setLeadsFallback(true);
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

  const assignedCustomers = useMemo(() => assignedTenants(tenantsData, amName, amId), [amId, amName, tenantsData]);
  const myCustomers = useMemo(
    () => (assignedCustomers.length > 0 ? assignedCustomers : tenantsData.filter((tenant) => tenant.country === "Kenya").slice(0, 5)),
    [assignedCustomers, tenantsData],
  );
  const rawOpportunities = useMemo(() => scopedOpportunities(leadsData, amName, amId), [amId, amName, leadsData]);
  const opportunities = useMemo(() => rawOpportunities.map(normalizeOpportunity), [rawOpportunities]);

  const myARR = myCustomers.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const achievement = MY_TARGET > 0 ? (myARR / MY_TARGET) * 100 : 0;
  const openOpportunities = opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const myPipeline = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const atRiskCustomers = myCustomers.filter((tenant) => (tenant.risk_score ?? 0) > 50);
  const renewalRows = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
    .filter((row): row is { tenant: TenantWithExtras; days: number } => row.days !== null && row.days >= 0)
    .sort((a, b) => a.days - b.days);
  const renewalsDue = renewalRows.filter((row) => row.days <= 90);
  const attentionCustomers = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)), health: tenantHealthScore(tenant) }))
    .filter((row) => (row.tenant.risk_score ?? 0) > 50 || (row.days !== null && row.days <= 90 && row.days >= 0) || row.health < 70)
    .sort((a, b) => (b.tenant.risk_score ?? 0) - (a.tenant.risk_score ?? 0));
  const highestValueOpportunity = [...openOpportunities].sort((a, b) => b.value - a.value)[0];
  const highestRiskCustomer = [...atRiskCustomers].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))[0];
  const nextRenewal = renewalsDue[0];

  const priorities = [
    ...renewalsDue
      .filter((row) => row.days <= 30)
      .slice(0, 2)
      .map((row) => `Renewal due: ${row.tenant.name} in ${row.days} days`),
    ...atRiskCustomers.slice(0, 2).map((tenant) => `Call ${tenant.name} - risk score ${tenant.risk_score ?? 0}`),
    ...openOpportunities
      .filter((opportunity) => opportunity.value >= 200000)
      .slice(0, 2)
      .map((opportunity) => `Follow up on ${opportunity.name} worth ${formatUSD(opportunity.value)}`),
    ...openOpportunities
      .filter((opportunity) => ["Proposal", "Negotiation"].includes(opportunity.stage))
      .slice(0, 2)
      .map((opportunity) => `Move ${opportunity.name} forward`),
    "Review customer follow-ups before end of day",
  ].slice(0, 7);

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
        <KpiCard icon={BriefcaseBusiness} label="My Pipeline" value={formatUSD(myPipeline)} />
        <KpiCard icon={TrendingUp} label="Open Opportunities" value={openOpportunities.length.toString()} />
        <KpiCard icon={CalendarClock} label="Renewals Due" value={renewalsDue.length.toString()} />
        <KpiCard icon={CheckSquare} label="Open Tasks" value={tasks.length.toString()} />
        <KpiCard icon={AlertTriangle} label="At-Risk Customers" value={atRiskCustomers.length.toString()} />
      </div>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Today&apos;s Priorities</CardTitle>
          <p className="text-sm text-gray-500">Execution list for {amName}. {leadsFallback ? "Opportunity fallback data is active." : ""}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {priorities.map((priority) => (
              <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4" key={priority}>
                <input className="mt-1 h-4 w-4 accent-[#0A9599]" disabled type="checkbox" />
                <span className="text-sm font-medium text-gray-800">{priority}</span>
              </label>
            ))}
          </div>
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
                  <tr className="border-b last:border-0" key={opportunity.id}>
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
                  <tr className="border-b last:border-0" key={tenant.id}>
                    <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenant.country ?? "Unassigned"}</td>
                    <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                    <td className="py-3 pr-4 text-right">{health.toFixed(0)}</td>
                    <td className="py-3 pr-4 text-right">
                      <Badge className={(tenant.risk_score ?? 0) > 50 ? "bg-red-500 text-white" : "bg-amber-500 text-white"}>
                        {tenant.risk_score ?? 0}
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
                      <tr className="border-b last:border-0" key={tenant.id}>
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
              {tasks.map((task) => (
                <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4" key={task.title}>
                  <input className="mt-1 h-4 w-4 accent-[#0A9599]" disabled type="checkbox" />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-gray-800">{task.title}</span>
                    <span className="mt-1 block text-xs text-gray-500">{task.due}</span>
                  </span>
                  <Badge className={priorityClass(task.priority)}>{task.priority}</Badge>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#0A9599]">Sales Coach</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-5">
          <CoachMetric label="Target progress" value={`${achievement.toFixed(1)}%`} />
          <CoachMetric label="Highest value opportunity" value={highestValueOpportunity ? highestValueOpportunity.name : "No open opportunity"} />
          <CoachMetric label="Highest risk customer" value={highestRiskCustomer ? `${highestRiskCustomer.name} (${highestRiskCustomer.risk_score ?? 0})` : "No high-risk customer"} />
          <CoachMetric label="Next renewal" value={nextRenewal ? `${nextRenewal.tenant.name} (${nextRenewal.days} days)` : "No renewal due"} />
          <div className="rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm lg:col-span-5">{coachRecommendation}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
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
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="flex h-32 flex-col justify-between p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{label}</p>
          <Icon className="h-4 w-4 text-[#0A9599]" />
        </div>
        <p className="text-2xl font-semibold tracking-normal text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}
