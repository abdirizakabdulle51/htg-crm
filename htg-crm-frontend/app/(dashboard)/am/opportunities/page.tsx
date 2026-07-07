"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { CalendarClock, CircleDollarSign, Target, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const STAGES = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;

const mockOpportunities: RawLead[] = [
  {
    name: "Banking Expansion",
    customer: "Kenya Tenant 03",
    country: "Kenya",
    sector: "Finance",
    stage: "Proposal",
    value: 450000,
    probability: 60,
    closeDate: "2026-08-15",
    owner: "Account Manager",
  },
  {
    name: "Telecom Backup",
    customer: "Kenya Tenant 01",
    country: "Kenya",
    sector: "Telecom",
    stage: "Negotiation",
    value: 280000,
    probability: 75,
    closeDate: "2026-07-30",
    owner: "Account Manager",
  },
  {
    name: "Government Cloud",
    customer: "Kenya Tenant 05",
    country: "Kenya",
    sector: "Government",
    stage: "Qualified",
    value: 220000,
    probability: 35,
    closeDate: "2026-09-10",
    owner: "Account Manager",
  },
  {
    name: "Healthcare DR",
    customer: "Kenya Tenant 04",
    country: "Kenya",
    sector: "Healthcare",
    stage: "Prospect",
    value: 200000,
    probability: 20,
    closeDate: "2026-10-01",
    owner: "Account Manager",
  },
];

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    code: string;
    message: string;
  } | null;
};

type RawLead = {
  id?: string | null;
  name?: string | null;
  opportunity_name?: string | null;
  title?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  customer?: string | null;
  tenant_name?: string | null;
  country?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  tenant_country?: string | null;
  sector?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  sectorName?: string | null;
  industry?: string | null;
  stage?: string | number | null;
  status?: string | null;
  pipeline_stage?: string | number | null;
  pipelineStage?: string | number | null;
  stage_name?: string | null;
  stage_number?: number | null;
  value?: number | null;
  potential_value?: number | null;
  value_usd?: number | null;
  valueUsd?: number | null;
  potential_value_usd?: number | null;
  estimated_value?: number | null;
  deal_value?: number | null;
  amount?: number | null;
  probability?: number | null;
  win_probability?: number | null;
  probability_percent?: number | null;
  owner?: { name?: string | null } | string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  ownerName?: string | null;
  assigned_user_name?: string | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  assigned_to_name?: string | null;
  account_manager?: string | null;
  accountManager?: string | null;
  account_manager_name?: string | null;
  account_manager_id?: string | null;
  closeDate?: string | null;
  close_date?: string | null;
  expected_close_date?: string | null;
  expectedCloseDate?: string | null;
  tenant?: {
    country?: string | null;
    sector?: string | null;
  } | null;
  owner_user?: {
    name?: string | null;
  } | null;
  user?: {
    name?: string | null;
  } | null;
};

type Opportunity = {
  id: string;
  name: string;
  customer: string;
  country: string;
  sector: string;
  stage: string;
  value: number;
  probability: number;
  closeDate: string;
  owner: string;
};

function unwrapList<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as T[];
  }
  return [];
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

function ownerValue(lead: RawLead) {
  const owner = typeof lead.owner === "string" ? lead.owner : lead.owner?.name;
  return (
    owner ??
    lead.owner_name ??
    lead.ownerName ??
    lead.assigned_user_name ??
    lead.assigned_to ??
    lead.assignedTo ??
    lead.assigned_to_name ??
    lead.account_manager ??
    lead.accountManager ??
    lead.account_manager_name ??
    lead.account_manager_id ??
    lead.owner_id ??
    lead.owner_user?.name ??
    lead.user?.name ??
    ""
  );
}

function matchesAM(value: string, amName: string, amId: string) {
  const normalizedValue = value.trim().toLowerCase();
  if (!normalizedValue) return false;
  return normalizedValue === amName.toLowerCase() || Boolean(amId && normalizedValue === amId.toLowerCase());
}

function scopedLeads(leads: RawLead[], amName: string, amId: string) {
  const hasOwnerData = leads.some((lead) => ownerValue(lead));
  if (hasOwnerData) {
    const mine = leads.filter((lead) => matchesAM(ownerValue(lead), amName, amId));
    if (mine.length) return mine;
  }

  const kenyaLeads = leads.filter((lead) => normalizeCountry(lead).toLowerCase() === "kenya");
  return kenyaLeads.length ? kenyaLeads : leads.slice(0, 6);
}

function normalizeStage(stage: RawLead["stage"]) {
  if (typeof stage === "number") {
    if (stage <= 1) return "Prospect";
    if (stage <= 3) return "Qualified";
    if (stage <= 5) return "Proposal";
    if (stage <= 8) return "Negotiation";
    if (stage === 9) return "Won";
    return "Lost";
  }

  const value = String(stage ?? "Prospect").trim();
  const normalized = value.replace(/_/g, " ").toLowerCase();
  if (normalized.includes("won")) return "Won";
  if (normalized.includes("lost")) return "Lost";
  if (normalized.includes("negotiation")) return "Negotiation";
  if (normalized.includes("proposal")) return "Proposal";
  if (normalized.includes("qualified")) return "Qualified";
  if (normalized.includes("prospect") || normalized.includes("new")) return "Prospect";
  return "Prospect";
}

function normalizeCountry(lead: RawLead) {
  return lead.country ?? lead.country_name ?? lead.countryName ?? lead.tenant_country ?? lead.tenant?.country ?? "Unassigned";
}

function normalizeSector(lead: RawLead) {
  return lead.sector ?? lead.sector_name ?? lead.sectorName ?? lead.industry ?? lead.tenant?.sector ?? "Unassigned";
}

function normalizeValue(lead: RawLead) {
  return (
    lead.value ??
    lead.potential_value ??
    lead.value_usd ??
    lead.valueUsd ??
    lead.potential_value_usd ??
    lead.estimated_value ??
    lead.deal_value ??
    lead.amount ??
    0
  );
}

function normalizeProbability(lead: RawLead, stage: string) {
  const provided = lead.probability ?? lead.win_probability ?? lead.probability_percent;
  if (typeof provided === "number") return provided <= 1 ? provided * 100 : provided;
  if (stage === "Negotiation") return 75;
  if (stage === "Proposal") return 60;
  if (stage === "Qualified") return 35;
  if (stage === "Won") return 100;
  if (stage === "Lost") return 0;
  return 20;
}

function normalizeOpportunity(lead: RawLead, index: number): Opportunity {
  const stage = normalizeStage(lead.stage ?? lead.status ?? lead.pipeline_stage ?? lead.pipelineStage ?? lead.stage_name ?? "Prospect");
  const name = lead.name ?? lead.opportunity_name ?? lead.title ?? lead.company_name ?? lead.companyName ?? "Unnamed opportunity";

  return {
    id: lead.id ?? `${name}-${index}`,
    name,
    customer: lead.customer ?? lead.company_name ?? lead.companyName ?? lead.tenant_name ?? lead.name ?? "Unassigned customer",
    country: normalizeCountry(lead),
    sector: normalizeSector(lead),
    stage,
    value: normalizeValue(lead),
    probability: normalizeProbability(lead, stage),
    closeDate: lead.closeDate ?? lead.close_date ?? lead.expected_close_date ?? lead.expectedCloseDate ?? "",
    owner: ownerValue(lead) || "Account Manager",
  };
}

function stageClass(stage: string) {
  if (stage === "Won") return "bg-green-100 text-green-700";
  if (stage === "Lost") return "bg-gray-100 text-gray-700";
  if (stage === "Negotiation") return "bg-teal-100 text-teal-700";
  if (stage === "Proposal") return "bg-blue-100 text-blue-700";
  if (stage === "Qualified") return "bg-yellow-100 text-yellow-700";
  return "bg-purple-100 text-purple-700";
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

function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isCurrentMonth(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function closePlanPriority(opportunity: Opportunity) {
  if (opportunity.value >= 400000 || opportunity.probability >= 70 || opportunity.stage === "Negotiation") return "High";
  return "Medium";
}

function priorityClass(priority: string) {
  return priority === "High" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700";
}

function recommendedAction(opportunity: Opportunity) {
  if (opportunity.stage === "Negotiation") return "Prepare closing plan";
  if (opportunity.stage === "Proposal") return "Send updated proposal";
  if (opportunity.probability >= 70) return "Schedule decision meeting";
  return "Confirm budget and timeline";
}

export default function AMOpportunitiesPage() {
  const { data: session, status } = useSession();
  const [leadsData, setLeadsData] = useState<RawLead[]>(mockOpportunities);

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

    async function loadOpportunities() {
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const response = await fetchJson<RawLead[] | { leads?: RawLead[]; items?: RawLead[] }>("/api/v1/leads", token);
        const leads = unwrapList<RawLead>(response, ["leads", "items"]);
        if (!cancelled) setLeadsData(leads.length ? leads : mockOpportunities);
      } catch (error) {
        console.error("AM opportunities fetch failed", error);
        if (!cancelled) setLeadsData(mockOpportunities);
      }
    }

    void loadOpportunities();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const rawOpportunities = useMemo(() => scopedLeads(leadsData, amName, amId), [amId, amName, leadsData]);
  const opportunities = useMemo(() => rawOpportunities.map(normalizeOpportunity), [rawOpportunities]);
  const sortedOpportunities = useMemo(() => [...opportunities].sort((a, b) => b.value - a.value), [opportunities]);
  const openOpportunities = opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const pipelineValue = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const weightedForecast = openOpportunities.reduce((sum, opportunity) => sum + (opportunity.value * opportunity.probability) / 100, 0);
  const averageDealSize = openOpportunities.length > 0 ? pipelineValue / openOpportunities.length : 0;
  const closingThisMonth = openOpportunities.filter((opportunity) => isCurrentMonth(opportunity.closeDate)).length;
  const highPriorityDeals = openOpportunities.filter((opportunity) => opportunity.value >= 250000 && opportunity.probability >= 50).length;
  const stageRows = STAGES.map((stage) => {
    const rows = opportunities.filter((opportunity) => opportunity.stage === stage);
    return {
      count: rows.length,
      stage,
      value: rows.reduce((sum, opportunity) => sum + opportunity.value, 0),
    };
  });
  const closePlanRows = sortedOpportunities.filter(
    (opportunity) => ["Proposal", "Negotiation"].includes(opportunity.stage) || opportunity.value >= 250000,
  );
  const highestValueDeal = [...openOpportunities].sort((a, b) => b.value - a.value)[0];
  const bestCloseCandidate = [...openOpportunities].sort((a, b) => b.probability - a.probability || b.value - a.value)[0];
  const dealsNeedingAction = closePlanRows.length;
  const coachRecommendation =
    highestValueDeal && bestCloseCandidate
      ? `Focus on ${highestValueDeal.name} and ${bestCloseCandidate.name} to improve this month's forecast.`
      : highestValueDeal
        ? `Focus on ${highestValueDeal.name} to improve this month's forecast.`
        : "Keep opportunity stages current and confirm next actions for every open deal.";

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">My Opportunities</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your sales opportunities, next actions, forecast, and close plans.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={CircleDollarSign} label="My Pipeline" value={formatUSD(pipelineValue)} />
        <KpiCard icon={Target} label="Open Opportunities" value={openOpportunities.length.toString()} />
        <KpiCard icon={TrendingUp} label="Weighted Forecast" value={formatUSD(weightedForecast)} />
        <KpiCard icon={CircleDollarSign} label="Average Deal Size" value={formatUSD(averageDealSize)} />
        <KpiCard icon={CalendarClock} label="Closing This Month" value={closingThisMonth.toString()} />
        <KpiCard icon={TrendingUp} label="High Priority Deals" value={highPriorityDeals.toString()} />
      </div>

      <Section title="Pipeline by Stage">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {stageRows.map((stage) => (
            <div className="rounded-lg border border-gray-200 bg-white p-4" key={stage.stage}>
              <Badge className={stageClass(stage.stage)}>{stage.stage}</Badge>
              <p className="mt-4 text-2xl font-semibold text-gray-900">{stage.count}</p>
              <p className="mt-1 text-sm text-gray-500">{formatUSD(stage.value)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Opportunity Board">
        <div className="grid gap-4 xl:grid-cols-6">
          {STAGES.map((stage) => {
            const rows = sortedOpportunities.filter((opportunity) => opportunity.stage === stage);
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3" key={stage}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge className={stageClass(stage)}>{stage}</Badge>
                  <span className="text-xs font-semibold text-gray-500">{rows.length}</span>
                </div>
                <div className="space-y-3">
                  {rows.map((opportunity) => (
                    <div className="rounded-lg border border-gray-200 bg-white p-3" key={opportunity.id}>
                      <p className="text-sm font-semibold text-gray-900">{opportunity.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{opportunity.customer}</p>
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        <p>{formatUSD(opportunity.value)}</p>
                        <p>{opportunity.probability.toFixed(0)}% probability</p>
                        <p>{formatDate(opportunity.closeDate)}</p>
                        <p className="font-medium text-[#0A9599]">{nextActionForStage(opportunity.stage)}</p>
                      </div>
                    </div>
                  ))}
                  {!rows.length && <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">No deals</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Opportunity Table">
        <Table minWidth="1120px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Value</th>
              <th className="py-3 pr-4 font-medium">Close Date</th>
              <th className="py-3 font-medium">Next Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedOpportunities.map((opportunity) => (
              <tr className="border-b last:border-0" key={opportunity.id}>
                <td className="py-3 pr-4 font-medium text-gray-900">{opportunity.name}</td>
                <td className="py-3 pr-4 text-gray-500">{opportunity.customer}</td>
                <td className="py-3 pr-4 text-gray-500">{opportunity.country}</td>
                <td className="py-3 pr-4">{opportunity.sector}</td>
                <td className="py-3 pr-4">
                  <Badge className={stageClass(opportunity.stage)}>{opportunity.stage}</Badge>
                </td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                <td className="py-3 pr-4 text-right">{opportunity.probability.toFixed(0)}%</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD((opportunity.value * opportunity.probability) / 100)}</td>
                <td className="py-3 pr-4 text-gray-500">{formatDate(opportunity.closeDate)}</td>
                <td className="py-3">{nextActionForStage(opportunity.stage)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Close Plan Priorities">
        <Table minWidth="880px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 pr-4 text-right font-medium">Priority</th>
              <th className="py-3 font-medium">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {closePlanRows.map((opportunity) => {
              const priority = closePlanPriority(opportunity);
              return (
                <tr className="border-b last:border-0" key={opportunity.id}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{opportunity.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{opportunity.customer}</td>
                  <td className="py-3 pr-4">
                    <Badge className={stageClass(opportunity.stage)}>{opportunity.stage}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                  <td className="py-3 pr-4 text-right">{opportunity.probability.toFixed(0)}%</td>
                  <td className="py-3 pr-4 text-right">
                    <Badge className={priorityClass(priority)}>{priority}</Badge>
                  </td>
                  <td className="py-3">{recommendedAction(opportunity)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#0A9599]">Sales Coach</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-5">
          <CoachMetric label="Highest value deal" value={highestValueDeal ? highestValueDeal.name : "No open deal"} />
          <CoachMetric label="Best close candidate" value={bestCloseCandidate ? bestCloseCandidate.name : "No candidate"} />
          <CoachMetric label="Forecast value" value={formatUSD(weightedForecast)} />
          <CoachMetric label="Deals needing action" value={dealsNeedingAction.toString()} />
          <div className="rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm lg:col-span-5">{coachRecommendation}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Table({ children, minWidth }: { children: ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
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
