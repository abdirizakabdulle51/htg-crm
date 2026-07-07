"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { BarChart3, BriefcaseBusiness, CalendarClock, Gauge, Target, TrendingUp, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const MY_TARGET = 1200000;
const TASK_COUNT = 4;
const ACTIVITY_COUNT = 5;

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

const mockTenants: TenantWithExtras[] = [
  {
    id: "kenya-tenant-01",
    name: "Kenya Tenant 01",
    country: "Kenya",
    sector: "Telecom",
    arr_usd: 720000,
    mrr_usd: 60000,
    health_score: 91,
    risk_score: 8,
    status: "ACTIVE",
    renewal_date: "2027-06-30",
  },
  {
    id: "kenya-tenant-02",
    name: "Kenya Tenant 02",
    country: "Kenya",
    sector: "Finance",
    arr_usd: 540000,
    mrr_usd: 45000,
    health_score: 89,
    risk_score: 10,
    status: "ACTIVE",
    renewal_date: "2027-03-31",
  },
  {
    id: "kenya-tenant-03",
    name: "Kenya Tenant 03",
    country: "Kenya",
    sector: "Government",
    arr_usd: 180000,
    mrr_usd: 15000,
    health_score: 78,
    risk_score: 22,
    status: "ACTIVE",
    renewal_date: "2026-12-15",
  },
  {
    id: "kenya-tenant-04",
    name: "Kenya Tenant 04",
    country: "Kenya",
    sector: "Healthcare",
    arr_usd: 150000,
    mrr_usd: 12500,
    health_score: 58,
    risk_score: 58,
    status: "AT_RISK",
    renewal_date: "2026-09-30",
  },
  {
    id: "kenya-tenant-05",
    name: "Kenya Tenant 05",
    country: "Kenya",
    sector: "Logistics",
    arr_usd: 300000,
    mrr_usd: 25000,
    health_score: 83,
    risk_score: 15,
    status: "ACTIVE",
    renewal_date: "2027-01-31",
  },
];

const monthlyPerformance = [
  { month: "Jan", arr: 65000, achievement: 5.4 },
  { month: "Feb", arr: 95000, achievement: 7.9 },
  { month: "Mar", arr: 140000, achievement: 11.7 },
  { month: "Apr", arr: 210000, achievement: 17.5 },
  { month: "May", arr: 320000, achievement: 26.7 },
  { month: "Jun", arr: 480000, achievement: 40.0 },
  { month: "Jul", arr: 650000, achievement: 54.2 },
];

type ApiEnvelope<T> = {
  data: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
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

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  stage: string;
  value: number;
  probability: number;
  owner: string;
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

function tenantCountry(tenant: TenantWithExtras) {
  return tenant.country ?? tenant.country_name ?? tenant.countryName ?? tenant.tenant_country ?? "";
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

function scopedCustomers(tenants: TenantWithExtras[], amName: string, amId: string) {
  const assignedCustomers = assignedTenants(tenants, amName, amId);
  if (assignedCustomers.length > 0) return assignedCustomers;

  const kenyaCustomers = tenants
    .filter((tenant) => tenantCountry(tenant).toLowerCase() === "kenya")
    .slice(0, 5);

  return kenyaCustomers.length > 0 ? kenyaCustomers : tenants.slice(0, 5);
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

function normalizeOpportunity(lead: LeadRow, index: number): Opportunity {
  const stage = opportunityStage(lead);

  return {
    id: lead.id ?? `${lead.name ?? lead.company_name ?? "opportunity"}-${index}`,
    name: lead.name ?? lead.opportunity_name ?? lead.title ?? lead.company_name ?? "Unnamed opportunity",
    customer: lead.company_name ?? lead.companyName ?? lead.customer ?? lead.tenant_name ?? lead.name ?? "Unassigned customer",
    stage,
    value: opportunityValue(lead),
    probability: opportunityProbability(lead, stage),
    owner: leadOwnerValue(lead) || "Account Manager",
  };
}

function forecastClass(category: string) {
  if (category === "High Confidence") return "bg-green-100 text-green-700";
  if (category === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function forecastCategory(probability: number) {
  if (probability >= 75) return "High Confidence";
  if (probability >= 50) return "Medium";
  return "Low";
}

function KpiCard({ title, value, icon }: { title: string; value: string | number; icon: ReactNode }) {
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
      <CardContent className="h-32 p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="text-[#0A9599]">{icon}</div>
        </div>
        <div className="mt-8 text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CoachMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-teal-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function AMPerformancePage() {
  const { data: session, status } = useSession();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);
  const [leadsData, setLeadsData] = useState<LeadRow[]>([]);

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

    async function loadPerformance() {
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      const [tenantsResponse, leadsResponse] = await Promise.allSettled([
        fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>("/api/v1/tenants", token),
        fetchJson<LeadsResponse>("/api/v1/leads", token),
      ]);

      if (cancelled) return;

      if (tenantsResponse.status === "fulfilled") {
        const tenants = unwrapList<TenantWithExtras>(tenantsResponse.value);
        setTenantsData(tenants.length ? tenants : mockTenants);
      } else {
        console.error("AM performance tenants fetch failed", tenantsResponse.reason);
        setTenantsData(mockTenants);
      }

      if (leadsResponse.status === "fulfilled") {
        const leads = unwrapList<LeadRow>(leadsResponse.value);
        setLeadsData(leads.length ? leads : mockOpportunities);
      } else {
        console.error("AM performance leads fetch failed", leadsResponse.reason);
        setLeadsData(mockOpportunities);
      }
    }

    void loadPerformance();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const myCustomers = useMemo(() => scopedCustomers(tenantsData, amName, amId), [amId, amName, tenantsData]);
  const rawOpportunities = useMemo(() => scopedOpportunities(leadsData, amName, amId), [amId, amName, leadsData]);
  const opportunities = useMemo(() => rawOpportunities.map(normalizeOpportunity), [rawOpportunities]);

  const myARR = myCustomers.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const achievement = MY_TARGET > 0 ? (myARR / MY_TARGET) * 100 : 0;
  const targetGap = Math.max(0, MY_TARGET - myARR);
  const openOpportunities = opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const pipeline = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const weightedForecast = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value * (opportunity.probability / 100), 0);
  const wonCount = opportunities.filter((opportunity) => opportunity.stage === "Won").length;
  const lostCount = opportunities.filter((opportunity) => opportunity.stage === "Lost").length;
  const winRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;
  const renewalRows = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
    .filter((row): row is { tenant: TenantWithExtras; days: number } => row.days !== null && row.days >= 0)
    .sort((a, b) => a.days - b.days);
  const renewalsDue = renewalRows.filter((row) => row.days <= 90);
  const renewalARR = renewalsDue.reduce((sum, row) => sum + tenantARR(row.tenant), 0);
  const averageHealth =
    myCustomers.length > 0
      ? myCustomers.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / myCustomers.length
      : 0;
  const averageRisk =
    myCustomers.length > 0 ? myCustomers.reduce((sum, tenant) => sum + (tenant.risk_score ?? 0), 0) / myCustomers.length : 0;
  const largestOpportunity = [...openOpportunities].sort((a, b) => b.value - a.value)[0];
  const bestMetric = achievement >= 100 ? "Target achievement" : myCustomers.length >= 5 ? "Customer coverage" : "Pipeline creation";
  const weakestMetric = winRate === 0 ? "Closed-won conversion" : achievement < 80 ? "Target achievement" : "Renewal coverage";

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">My Performance</h1>
        <p className="mt-2 text-sm text-gray-500">
          Track personal sales performance, targets, pipeline, and achievement.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="My ARR" value={formatUSD(myARR)} icon={<Trophy className="h-5 w-5" />} />
        <KpiCard title="My Target" value={formatUSD(MY_TARGET)} icon={<Target className="h-5 w-5" />} />
        <KpiCard title="Achievement %" value={`${achievement.toFixed(1)}%`} icon={<Gauge className="h-5 w-5" />} />
        <KpiCard title="Pipeline" value={formatUSD(pipeline)} icon={<BriefcaseBusiness className="h-5 w-5" />} />
        <KpiCard title="Weighted Forecast" value={formatUSD(weightedForecast)} icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Win Rate" value={`${winRate.toFixed(0)}%`} icon={<BarChart3 className="h-5 w-5" />} />
        <KpiCard title="Renewal ARR" value={formatUSD(renewalARR)} icon={<CalendarClock className="h-5 w-5" />} />
        <KpiCard title="Customers Managed" value={myCustomers.length} icon={<Users className="h-5 w-5" />} />
      </div>

      <Section title="Target Progress">
        <div className="grid gap-4 md:grid-cols-4">
          <CoachMetric label="Current ARR" value={formatUSD(myARR)} />
          <CoachMetric label="Target" value={formatUSD(MY_TARGET)} />
          <CoachMetric label="Gap Remaining" value={formatUSD(targetGap)} />
          <CoachMetric label="Achievement" value={`${achievement.toFixed(1)}%`} />
        </div>
        <div className="mt-6">
          <div className="h-4 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-[#0A9599]" style={{ width: `${Math.min(100, achievement)}%` }} />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {achievement.toFixed(1)}% achieved against a personal target of {formatUSD(MY_TARGET)}.
          </p>
        </div>
      </Section>

      <Section title="Monthly Performance">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Month</th>
                <th className="py-3 pr-4 text-right font-semibold">ARR Contribution</th>
                <th className="py-3 pr-4 text-right font-semibold">Achievement %</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPerformance.map((month) => (
                <tr key={month.month} className="border-b border-gray-100 last:border-0">
                  <td className="py-4 pr-4 font-semibold text-gray-900">{month.month}</td>
                  <td className="py-4 pr-4 text-right font-semibold text-gray-900">{formatUSD(month.arr)}</td>
                  <td className="py-4 pr-4 text-right text-gray-600">{month.achievement.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Pipeline Forecast">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-semibold">Opportunity</th>
                <th className="py-3 pr-4 font-semibold">Stage</th>
                <th className="py-3 pr-4 text-right font-semibold">Value</th>
                <th className="py-3 pr-4 text-right font-semibold">Probability</th>
                <th className="py-3 pr-4 text-right font-semibold">Weighted Value</th>
                <th className="py-3 pr-4 font-semibold">Forecast Category</th>
              </tr>
            </thead>
            <tbody>
              {openOpportunities.map((opportunity) => {
                const category = forecastCategory(opportunity.probability);

                return (
                  <tr key={opportunity.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-gray-900">{opportunity.name}</p>
                      <p className="text-xs text-gray-500">{opportunity.customer}</p>
                    </td>
                    <td className="py-4 pr-4 text-gray-600">{opportunity.stage}</td>
                    <td className="py-4 pr-4 text-right font-semibold text-gray-900">{formatUSD(opportunity.value)}</td>
                    <td className="py-4 pr-4 text-right text-gray-600">{opportunity.probability.toFixed(0)}%</td>
                    <td className="py-4 pr-4 text-right font-semibold text-gray-900">
                      {formatUSD(opportunity.value * (opportunity.probability / 100))}
                    </td>
                    <td className="py-4 pr-4">
                      <Badge className={forecastClass(category)}>{category}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Personal Scorecard">
        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
          <CoachMetric label="Customers Managed" value={myCustomers.length} />
          <CoachMetric label="Opportunities" value={openOpportunities.length} />
          <CoachMetric label="Renewals" value={renewalsDue.length} />
          <CoachMetric label="Tasks" value={TASK_COUNT} />
          <CoachMetric label="Activities" value={ACTIVITY_COUNT} />
          <CoachMetric label="Average Health" value={`${averageHealth.toFixed(0)}%`} />
          <CoachMetric label="Average Risk" value={averageRisk.toFixed(0)} />
        </div>
      </Section>

      <section className="rounded-lg border border-teal-200 bg-teal-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Performance Coach</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <CoachMetric label="Best Metric" value={bestMetric} />
          <CoachMetric label="Weakest Metric" value={weakestMetric} />
          <CoachMetric label="Largest Opportunity" value={largestOpportunity?.name ?? "No open opportunity"} />
          <CoachMetric label="Target Gap" value={formatUSD(targetGap)} />
        </div>
        <div className="mt-5 rounded-lg border border-teal-100 bg-white p-4 text-sm text-gray-700">
          {largestOpportunity
            ? `Focus on converting ${largestOpportunity.name} to improve forecast confidence.`
            : "Build qualified pipeline to improve target confidence."}
        </div>
      </section>
    </div>
  );
}
