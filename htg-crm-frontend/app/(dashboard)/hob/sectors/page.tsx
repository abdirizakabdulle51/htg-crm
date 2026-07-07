"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const STAGES = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const COUNTRY_BY_ID: Record<string, string> = {
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

const SECTOR_BY_ID: Record<string, string> = {
  "a76b023f-7343-4d23-8653-51118277fbf7": "Agriculture",
  "d5f9d2da-06b2-4299-820d-bdf944643bfd": "Education",
  "df989d27-11eb-4d87-80e3-74b9e8ebfdea": "Energy",
  "59221f4e-b1bb-4044-b844-659bea171825": "Finance",
  "a507bfe5-bfc0-496f-9443-e27603fc77a2": "Government",
  "13933d31-10d7-45db-9ecb-042790fa8a59": "Healthcare",
  "dcce22ab-7c80-414e-8b30-e7361d87ae3d": "Hospitality",
  "fcb59619-1066-4857-8280-2dead6856281": "Logistics",
  "dca6440f-ee55-473a-a91e-9b00794277ac": "Manufacturing",
  "0fc039f3-1f73-4b60-801a-a9d13638a974": "NGO",
  "a2947294-74d8-4a53-b605-6d85f63bb720": "Retail",
  "d3ef1714-976e-4048-b0fc-958d84995c9f": "Telecom",
};

const mockLeads = [
  { name: "Banking Expansion", country: "Kenya", sector: "Finance", stage: "Proposal", value: 450000, probability: 65 },
  { name: "Government Cloud", country: "Ethiopia", sector: "Government", stage: "Qualified", value: 300000, probability: 45 },
  { name: "Telecom Backup", country: "Somalia", sector: "Telecom", stage: "Negotiation", value: 220000, probability: 75 },
  { name: "Healthcare DR", country: "Djibouti", sector: "Healthcare", stage: "Prospect", value: 180000, probability: 30 },
  { name: "Logistics Platform", country: "Kenya", sector: "Logistics", stage: "Proposal", value: 390000, probability: 60 },
  { name: "Finance Cloud", country: "Ethiopia", sector: "Finance", stage: "Qualified", value: 260000, probability: 50 },
  { name: "Public Sector Backup", country: "Somalia", sector: "Government", stage: "Negotiation", value: 310000, probability: 70 },
  { name: "Telecom Security Upgrade", country: "Djibouti", sector: "Telecom", stage: "Proposal", value: 240000, probability: 55 },
];

type TenantRow = {
  id?: string;
  name?: string;
  sector?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  sectorName?: string | null;
  risk_score?: number | null;
  arr_usd?: number | null;
  arrUsd?: number | null;
  monthly_revenue_usd?: number | null;
  mrr_usd?: number | null;
  health_score?: number | null;
  healthScore?: number | null;
  health?: string | null;
};

type RawLead = {
  name?: string | null;
  opportunity_name?: string | null;
  title?: string | null;
  company_name?: string | null;
  companyName?: string | null;
  country?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  countryName?: string | null;
  sector?: string | null;
  sector_id?: string | null;
  sector_name?: string | null;
  sectorName?: string | null;
  industry?: string | null;
  stage?: string | number | null;
  stage_name?: string | null;
  stage_number?: number | null;
  status?: string | null;
  pipeline_stage?: string | number | null;
  pipelineStage?: string | number | null;
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
  tenant?: {
    country?: string | null;
    sector?: string | null;
  } | null;
};

type Lead = {
  name: string;
  country: string;
  sector: string;
  stage: string;
  value: number;
  probability: number;
};

type SectorRow = {
  sector: string;
  arr: number;
  tenantCount: number;
  pipeline: number;
  weighted: number;
  atRiskRevenue: number;
  healthScore: number;
};

type Signal = {
  message: string;
  tone: "red" | "yellow";
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

function tenantARR(tenant: TenantRow) {
  return tenant.arr_usd ?? tenant.arrUsd ?? (tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? 0) * 12;
}

function tenantSector(tenant: TenantRow) {
  return tenant.sector ?? tenant.sector_name ?? tenant.sectorName ?? (tenant.sector_id ? SECTOR_BY_ID[tenant.sector_id] : undefined) ?? "Unassigned";
}

function tenantHealthScore(tenant: TenantRow) {
  const score = tenant.health_score ?? tenant.healthScore;
  if (typeof score === "number") return score <= 1 ? score * 100 : score;
  if (tenant.health === "GREEN") return 90;
  if (tenant.health === "YELLOW") return 70;
  if (tenant.health === "RED") return 40;
  return Math.max(0, 100 - (tenant.risk_score ?? 0));
}

function normalizeStage(stage: RawLead["stage"], stageName?: string | null, stageNumber?: number | null) {
  const number = stageNumber ?? (typeof stage === "number" ? stage : undefined);
  if (number !== undefined) {
    if (number <= 1) return "Prospect";
    if (number <= 3) return "Qualified";
    if (number <= 5) return "Proposal";
    if (number <= 8) return "Negotiation";
    if (number === 9) return "Won";
    return "Lost";
  }

  const value = String(stageName ?? stage ?? "Prospect").trim();
  const normalized = value.replace(/_/g, " ").toLowerCase();
  if (normalized.includes("won")) return "Won";
  if (normalized.includes("lost")) return "Lost";
  if (normalized.includes("negotiation")) return "Negotiation";
  if (normalized.includes("proposal")) return "Proposal";
  if (normalized.includes("qualified")) return "Qualified";
  if (normalized.includes("prospect") || normalized.includes("new")) return "Prospect";
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Prospect";
}

function normalizeLead(raw: RawLead): Lead {
  const value =
    raw.value ??
    raw.potential_value ??
    raw.estimated_value ??
    raw.deal_value ??
    raw.amount ??
    raw.value_usd ??
    raw.valueUsd ??
    raw.potential_value_usd ??
    0;
  const rawProbability = raw.probability ?? raw.win_probability ?? raw.probability_percent ?? 0;
  const probability = rawProbability <= 1 ? rawProbability * 100 : rawProbability;

  return {
    name: raw.name ?? raw.opportunity_name ?? raw.title ?? raw.company_name ?? raw.companyName ?? "Unnamed",
    country:
      raw.country ??
      raw.country_name ??
      raw.countryName ??
      raw.tenant?.country ??
      (raw.country_id ? COUNTRY_BY_ID[raw.country_id] : undefined) ??
      "Unassigned",
    sector:
      raw.sector ??
      raw.sector_name ??
      raw.sectorName ??
      raw.industry ??
      raw.tenant?.sector ??
      (raw.sector_id ? SECTOR_BY_ID[raw.sector_id] : undefined) ??
      "Unassigned",
    stage: normalizeStage(raw.stage ?? raw.status ?? raw.pipeline_stage ?? raw.pipelineStage, raw.stage_name, raw.stage_number),
    value,
    probability,
  };
}

function statusFor(row: SectorRow) {
  if (row.healthScore < 60) return "Weak";
  if (row.arr >= 1000000 && row.healthScore >= 80) return "Strong";
  return "Watch";
}

function statusClass(status: string) {
  if (status === "Strong") return "bg-green-100 text-green-700";
  if (status === "Weak") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

function stageClass(stage: string) {
  if (stage === "Won") return "text-green-700";
  if (stage === "Lost") return "text-gray-500";
  if (stage === "Negotiation") return "text-teal-700";
  if (stage === "Proposal") return "text-blue-700";
  if (stage === "Qualified") return "text-yellow-700";
  return "text-purple-700";
}

function actionFor(lead: Lead, sectorRows: SectorRow[]) {
  const sector = sectorRows.find((row) => row.sector === lead.sector);
  if (lead.probability >= 70) return "Push to close";
  if (lead.value >= 300000 && lead.probability < 60) return "Commercial review";
  if (sector && sector.arr >= 1000000 && sector.pipeline < sector.arr * 0.2) return "Create sector plan";
  return "Monitor";
}

function signalClass(tone: Signal["tone"]) {
  return tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-yellow-200 bg-yellow-50 text-yellow-800";
}

export default function HOBSectorsPage() {
  const { data: session, status } = useSession();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>(mockLeads);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API}/api/v1/tenants`, {
      headers,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => setTenants(unwrapList<TenantRow>(json.data ?? json, ["tenants", "items"])))
      .catch(() => setTenants([]));

    fetch(`${API}/api/v1/leads`, {
      headers,
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Leads fetch failed");
        return response.json();
      })
      .then((json) => {
        const rows = unwrapList<RawLead>(json.data ?? json, ["leads", "items"]);
        if (rows.length === 0) throw new Error("No leads returned");
        setLeads(rows.map(normalizeLead));
      })
      .catch(() => setLeads(mockLeads));
  }, [status, session]);

  const totalARR = tenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);

  const sectorRows = useMemo(() => {
    const names = new Set<string>();
    tenants.forEach((tenant) => names.add(tenantSector(tenant)));
    leads.forEach((lead) => names.add(lead.sector));

    return Array.from(names)
      .map((sector) => {
        const sectorTenants = tenants.filter((tenant) => tenantSector(tenant) === sector);
        const sectorLeads = leads.filter((lead) => lead.sector === sector);
        const arr = sectorTenants.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
        const pipeline = sectorLeads.reduce((sum, lead) => sum + lead.value, 0);
        const weighted = sectorLeads.reduce((sum, lead) => sum + (lead.value * lead.probability) / 100, 0);
        const atRiskRevenue = sectorTenants
          .filter((tenant) => (tenant.risk_score ?? 0) > 50)
          .reduce((sum, tenant) => sum + tenantARR(tenant), 0);
        const healthScore =
          sectorTenants.length > 0
            ? sectorTenants.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / sectorTenants.length
            : 0;

        return {
          arr,
          atRiskRevenue,
          healthScore,
          pipeline,
          sector,
          tenantCount: sectorTenants.length,
          weighted,
        };
      })
      .sort((a, b) => b.arr - a.arr);
  }, [leads, tenants]);

  const topSectorByARR = [...sectorRows].sort((a, b) => b.arr - a.arr)[0];
  const topSectorPipeline = [...sectorRows].sort((a, b) => b.pipeline - a.pipeline)[0];
  const highestCustomerCount = [...sectorRows].sort((a, b) => b.tenantCount - a.tenantCount)[0];
  const weakestSector = [...sectorRows].filter((row) => row.tenantCount > 0).sort((a, b) => a.healthScore - b.healthScore)[0];
  const atRiskSectorRevenue = sectorRows.reduce((sum, row) => sum + row.atRiskRevenue, 0);

  const stageRows = useMemo(() => {
    return sectorRows.map((sector) => {
      const sectorLeads = leads.filter((lead) => lead.sector === sector.sector);
      const stages = STAGES.map((stage) => {
        const rows = sectorLeads.filter((lead) => lead.stage === stage);
        return {
          count: rows.length,
          stage,
          value: rows.reduce((sum, lead) => sum + lead.value, 0),
        };
      });
      return {
        sector: sector.sector,
        stages,
        total: sectorLeads.reduce((sum, lead) => sum + lead.value, 0),
      };
    });
  }, [leads, sectorRows]);

  const focusOpportunities = useMemo(() => [...leads].sort((a, b) => b.value - a.value).slice(0, 5), [leads]);

  const signals = useMemo(() => {
    const rows: Signal[] = [];
    sectorRows.forEach((sector) => {
      if (sector.atRiskRevenue > 100000) {
        rows.push({ tone: "red", message: `${sector.sector} has ${formatUSD(sector.atRiskRevenue)} at-risk revenue` });
      }
      if (sector.tenantCount > 0 && sector.healthScore < 70) {
        rows.push({ tone: "yellow", message: `${sector.sector} customer health is below target` });
      }
      if (sector.arr > 0 && sector.pipeline < sector.arr * 0.2) {
        rows.push({ tone: "yellow", message: `${sector.sector} has weak pipeline coverage` });
      }
      if (sector.arr >= 1000000 && sector.pipeline < sector.arr * 0.2) {
        rows.push({ tone: "yellow", message: `${sector.sector} needs new pipeline generation` });
      }
    });
    return rows;
  }, [sectorRows]);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Sector Performance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Commercial performance across industries, growth, pipeline, and market opportunities.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total Sectors" value={new Set(tenants.map(tenantSector)).size.toString()} />
        <KpiCard label="Top Sector by ARR" value={topSectorByARR?.sector ?? "Not available"} />
        <KpiCard label="Top Sector Pipeline" value={topSectorPipeline?.sector ?? "Not available"} />
        <KpiCard label="At-Risk Sector Revenue" value={formatUSD(atRiskSectorRevenue)} />
        <KpiCard label="Highest Customer Count" value={highestCustomerCount?.sector ?? "Not available"} />
        <KpiCard label="Weakest Sector" value={weakestSector?.sector ?? "Not available"} />
      </div>

      <Section title="Sector Performance Table" subtitle="ARR, customer health, pipeline, and weighted forecast by sector.">
        <Table minWidth="1080px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 text-right font-medium">ARR</th>
              <th className="py-3 pr-4 text-right font-medium">% of Company ARR</th>
              <th className="py-3 pr-4 text-right font-medium">Tenant Count</th>
              <th className="py-3 pr-4 text-right font-medium">Pipeline Value</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Forecast</th>
              <th className="py-3 pr-4 text-right font-medium">At-Risk Revenue</th>
              <th className="py-3 pr-4 text-right font-medium">Health Score</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((sector) => {
              const statusLabel = statusFor(sector);
              return (
                <tr className="border-b last:border-0" key={sector.sector}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{sector.sector}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(sector.arr)}</td>
                  <td className="py-3 pr-4 text-right">{totalARR > 0 ? ((sector.arr / totalARR) * 100).toFixed(1) : "0.0"}%</td>
                  <td className="py-3 pr-4 text-right">{sector.tenantCount}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(sector.pipeline)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(sector.weighted)}</td>
                  <td className="py-3 pr-4 text-right">{formatUSD(sector.atRiskRevenue)}</td>
                  <td className="py-3 pr-4 text-right">{sector.healthScore.toFixed(0)}</td>
                  <td className="py-3 text-right">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass(statusLabel)}`}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Sector Pipeline Breakdown" subtitle="Stage coverage by sector, with count and value in each stage.">
        <Table minWidth="1120px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Sector</th>
              {STAGES.map((stage) => (
                <th className={`py-3 pr-4 text-right font-medium ${stageClass(stage)}`} key={stage}>
                  {stage}
                </th>
              ))}
              <th className="py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {stageRows.map((row) => (
              <tr className="border-b last:border-0" key={row.sector}>
                <td className="py-3 pr-4 font-medium text-gray-900">{row.sector}</td>
                {row.stages.map((stage) => (
                  <td className="py-3 pr-4 text-right" key={`${row.sector}-${stage.stage}`}>
                    <span className="font-semibold">{stage.count}</span>
                    <span className="block text-xs text-gray-500">{formatUSD(stage.value)}</span>
                  </td>
                ))}
                <td className="py-3 text-right font-semibold">{formatUSD(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Sector Opportunity Focus" subtitle="Largest opportunities across all commercial sectors.">
        <Table minWidth="980px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {focusOpportunities.map((lead) => (
              <tr className="border-b last:border-0" key={`${lead.name}-${lead.country}-${lead.sector}`}>
                <td className="py-3 pr-4 font-medium text-gray-900">{lead.name}</td>
                <td className="py-3 pr-4">{lead.sector}</td>
                <td className="py-3 pr-4 text-gray-500">{lead.country}</td>
                <td className="py-3 pr-4">{lead.stage}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(lead.value)}</td>
                <td className="py-3 pr-4 text-right">{lead.probability}%</td>
                <td className="py-3 text-right font-semibold text-[#0A9599]">{actionFor(lead, sectorRows)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Sector Risk Signals" subtitle="Auto-generated sector health and pipeline intervention signals.">
        <div className="space-y-3">
          {signals.length > 0 ? (
            signals.map((signal) => (
              <div className={`rounded-lg border p-3 text-sm font-medium ${signalClass(signal.tone)}`} key={signal.message}>
                {signal.message}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm text-[#0A9599]">
              Sector performance is healthy.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
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
