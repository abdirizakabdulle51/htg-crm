"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

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
  {
    title: "Follow up Banking Expansion proposal",
    customer: "Kenya Tenant 03",
    priority: "High",
    due: "Today",
    status: "Open",
  },
  {
    title: "Schedule renewal meeting",
    customer: "Kenya Tenant 04",
    priority: "High",
    due: "Today",
    status: "Open",
  },
  {
    title: "Update opportunity stages",
    customer: "Banking Expansion",
    priority: "Medium",
    due: "Tomorrow",
    status: "Open",
  },
  {
    title: "Send customer health summary",
    customer: "Kenya Tenant 01",
    priority: "Medium",
    due: "This Week",
    status: "Open",
  },
  {
    title: "Review cross-sell proposal",
    customer: "Kenya Tenant 02",
    priority: "Low",
    due: "This Week",
    status: "Open",
  },
];

const activities = [
  {
    date: "Today",
    time: "09:00",
    type: "Call",
    customer: "Kenya Tenant 04",
    outcome: "Follow-up scheduled",
  },
  {
    date: "Today",
    time: "11:15",
    type: "Meeting",
    customer: "Kenya Tenant 03",
    outcome: "Proposal under review",
  },
  {
    date: "Yesterday",
    time: "15:20",
    type: "Email",
    customer: "Kenya Tenant 01",
    outcome: "Awaiting response",
  },
  {
    date: "Yesterday",
    time: "10:30",
    type: "Note",
    customer: "Kenya Tenant 02",
    outcome: "Opportunity identified",
  },
  {
    date: "This Week",
    time: "13:00",
    type: "Call",
    customer: "Kenya Tenant 05",
    outcome: "Healthy account",
  },
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
  account_manager_id?: string | null;
  account_manager_name?: string | null;
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

type NormalizedOpportunity = {
  id: string;
  name: string;
  stage: string;
  value: number;
  probability: number;
};

type ReportCard = {
  title: string;
  description: string;
  format: "CSV" | "PDF";
  disabled?: boolean;
  onDownload?: () => void;
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

function tenantMRR(tenant: TenantWithExtras) {
  return tenant.mrr_usd ?? tenant.monthly_revenue_usd ?? tenantARR(tenant) / 12;
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
    stage,
    value: opportunityValue(lead),
    probability: opportunityProbability(lead, stage),
  };
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

function renewalPriority(tenant: TenantWithExtras) {
  const days = daysUntil(tenantRenewalDate(tenant));
  if ((tenant.risk_score ?? 0) > 70 || (days !== null && days < 30)) return "High";
  if ((tenant.risk_score ?? 0) > 50 || (days !== null && days < 90)) return "Medium";
  return "Low";
}

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayLabel() {
  return "Today";
}

export default function AMReportsPage() {
  const { data: session, status } = useSession();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);
  const [leadsData, setLeadsData] = useState<LeadRow[]>([]);
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

    async function loadReportData() {
      setLoading(true);
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const [tenantsResponse, leadsResponse] = await Promise.allSettled([
          fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>("/api/v1/tenants", token),
          fetchJson<LeadsResponse>("/api/v1/leads", token),
        ]);

        if (cancelled) return;

        if (tenantsResponse.status === "fulfilled") {
          const tenants = unwrapList<TenantWithExtras>(tenantsResponse.value);
          setTenantsData(tenants.length ? tenants : mockTenants);
        } else {
          console.error("AM report tenants fetch failed", tenantsResponse.reason);
          setTenantsData(mockTenants);
        }

        if (leadsResponse.status === "fulfilled") {
          const leads = unwrapList<LeadRow>(leadsResponse.value);
          setLeadsData(leads.length ? leads : mockOpportunities);
        } else {
          console.error("AM report leads fetch failed", leadsResponse.reason);
          setLeadsData(mockOpportunities);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReportData();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const assignedCustomers = useMemo(() => assignedTenants(tenantsData, amName, amId), [amId, amName, tenantsData]);
  const myCustomers = useMemo(() => {
    if (assignedCustomers.length > 0) return assignedCustomers;

    const kenyaCustomers = tenantsData
      .filter((tenant) => tenantCountry(tenant).toLowerCase() === "kenya")
      .slice(0, 5);

    return kenyaCustomers.length > 0 ? kenyaCustomers : tenantsData.slice(0, 5);
  }, [assignedCustomers, tenantsData]);
  const rawOpportunities = useMemo(() => scopedOpportunities(leadsData, amName, amId), [amId, amName, leadsData]);
  const opportunities = useMemo(() => rawOpportunities.map(normalizeOpportunity), [rawOpportunities]);

  const renewalCustomers = useMemo(
    () =>
      [...myCustomers]
        .filter((tenant) => tenantRenewalDate(tenant))
        .sort((a, b) => {
          const first = daysUntil(tenantRenewalDate(a)) ?? Number.MAX_SAFE_INTEGER;
          const second = daysUntil(tenantRenewalDate(b)) ?? Number.MAX_SAFE_INTEGER;
          return first - second;
        }),
    [myCustomers],
  );

  const exportCustomers = () => {
    downloadCsv("am-customer-portfolio.csv", [
      ["Customer", "Sector", "ARR", "MRR", "Health", "Risk", "Renewal", "Status"],
      ...myCustomers.map((tenant) => [
        tenant.name,
        tenantSector(tenant),
        tenantARR(tenant).toFixed(0),
        tenantMRR(tenant).toFixed(0),
        tenantHealthScore(tenant).toFixed(0),
        (tenant.risk_score ?? 0).toString(),
        formatDate(tenantRenewalDate(tenant)),
        tenant.status ?? "ACTIVE",
      ]),
    ]);
  };

  const exportOpportunities = () => {
    downloadCsv("am-opportunity-pipeline.csv", [
      ["Opportunity", "Stage", "Value", "Probability", "Forecast"],
      ...opportunities.map((opportunity) => [
        opportunity.name,
        opportunity.stage,
        opportunity.value.toFixed(0),
        `${opportunity.probability.toFixed(0)}%`,
        ((opportunity.value * opportunity.probability) / 100).toFixed(0),
      ]),
    ]);
  };

  const exportRenewals = () => {
    downloadCsv("am-renewal-summary.csv", [
      ["Customer", "Renewal", "ARR", "Risk", "Priority"],
      ...renewalCustomers.map((tenant) => [
        tenant.name,
        formatDate(tenantRenewalDate(tenant)),
        tenantARR(tenant).toFixed(0),
        (tenant.risk_score ?? 0).toString(),
        renewalPriority(tenant),
      ]),
    ]);
  };

  const exportTasks = () => {
    downloadCsv("am-task-report.csv", [
      ["Task", "Customer", "Priority", "Due", "Status"],
      ...tasks.map((task) => [task.title, task.customer, task.priority, task.due, task.status]),
    ]);
  };

  const exportActivities = () => {
    downloadCsv("am-activity-summary.csv", [
      ["Date", "Time", "Type", "Customer", "Outcome"],
      ...activities.map((activity) => [activity.date, activity.time, activity.type, activity.customer, activity.outcome]),
    ]);
  };

  const reportCards: ReportCard[] = [
    {
      title: "Customer Portfolio",
      description: "Assigned customers, ARR, health, renewals, and status.",
      format: "CSV",
      onDownload: exportCustomers,
    },
    {
      title: "Opportunity Pipeline",
      description: "Open opportunities, stages, values, and weighted forecast.",
      format: "CSV",
      onDownload: exportOpportunities,
    },
    {
      title: "Renewal Summary",
      description: "Upcoming renewals, revenue exposure, and retention priority.",
      format: "CSV",
      onDownload: exportRenewals,
    },
    {
      title: "Task Report",
      description: "Daily follow-ups, priorities, due windows, and task status.",
      format: "CSV",
      onDownload: exportTasks,
    },
    {
      title: "Activity Summary",
      description: "Customer interactions, meeting outcomes, and account activity.",
      format: "CSV",
      onDownload: exportActivities,
    },
    {
      title: "Personal Performance",
      description: "Personal sales performance, target progress, and coaching.",
      format: "PDF",
      disabled: true,
    },
  ];

  const availableReports = [
    { report: "Customer Portfolio", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Opportunity Pipeline", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Renewal Summary", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Task Report", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Activity Summary", format: "CSV", lastUpdated: todayLabel(), status: "Available" },
    { report: "Personal Performance", format: "PDF", lastUpdated: todayLabel(), status: "Coming Soon" },
  ];

  if (status === "loading" || loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate personal sales reports, customer exports, opportunity summaries, and activity reports.
        </p>
      </section>

      <Section title="Report Library" subtitle="Personal exports for your customers, opportunities, renewals, tasks, and activity.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reportCards.map((report) => (
            <div className="rounded-lg border border-gray-200 p-5" key={report.title}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">{report.description}</p>
                </div>
                <span className="rounded-full bg-[#0A9599]/10 px-2.5 py-1 text-xs font-semibold text-[#0A9599]">
                  {report.format}
                </span>
              </div>
              <span title={report.disabled ? "Coming soon" : undefined}>
                <button
                  className={`mt-5 rounded-md px-4 py-2 text-sm font-semibold ${
                    report.disabled
                      ? "cursor-not-allowed bg-gray-100 text-gray-400"
                      : "bg-[#0A9599] text-white hover:bg-[#087b7f]"
                  }`}
                  disabled={report.disabled}
                  onClick={report.onDownload}
                  type="button"
                >
                  {report.format === "PDF" ? "Export PDF" : "Export CSV"}
                </button>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Available Reports" subtitle="Current personal reporting catalog and export availability.">
        <Table minWidth="720px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Report</th>
              <th className="py-3 pr-4 font-medium">Format</th>
              <th className="py-3 pr-4 font-medium">Last Updated</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {availableReports.map((report) => (
              <tr className="border-b last:border-0" key={report.report}>
                <td className="py-3 pr-4 font-medium text-gray-900">{report.report}</td>
                <td className="py-3 pr-4 text-gray-500">{report.format}</td>
                <td className="py-3 pr-4">{report.lastUpdated}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(report.status)}`}>
                    {report.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0A9599]">Report Summary</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Total Reports" value="6" />
          <SummaryMetric label="Working Downloads" value="5" />
          <SummaryMetric label="Coming Soon" value="1" />
          <SummaryMetric label="Last Refresh" value={todayLabel()} />
        </div>
        <p className="mt-5 text-sm text-gray-700">
          Export your Opportunity Pipeline before your weekly sales review.
        </p>
      </section>
    </div>
  );
}

function statusClass(status: string) {
  return status === "Available" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";
}

function Section({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Table({ children, minWidth }: { children: React.ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
