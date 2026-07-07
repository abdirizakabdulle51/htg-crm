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

const mockOpportunities = [
  { name: "Banking Expansion", country: "Kenya", sector: "Finance", stage: "Proposal", value: 450000, owner: "GM Kenya", probability: 65, closeDate: "2026-08-15" },
  { name: "Government Cloud", country: "Ethiopia", sector: "Government", stage: "Qualified", value: 300000, owner: "GM Ethiopia", probability: 45, closeDate: "2026-09-01" },
  { name: "Telecom Backup", country: "Somalia", sector: "Telecom", stage: "Negotiation", value: 220000, owner: "GM Somalia", probability: 75, closeDate: "2026-07-25" },
  { name: "Healthcare DR", country: "Djibouti", sector: "Healthcare", stage: "Prospect", value: 180000, owner: "GM Djibouti", probability: 30, closeDate: "2026-09-20" },
  { name: "Logistics Platform", country: "Kenya", sector: "Logistics", stage: "Proposal", value: 390000, owner: "GM Kenya", probability: 60, closeDate: "2026-08-05" },
  { name: "Finance Cloud", country: "Ethiopia", sector: "Finance", stage: "Qualified", value: 260000, owner: "GM Ethiopia", probability: 50, closeDate: "2026-08-30" },
  { name: "Public Sector Backup", country: "Somalia", sector: "Government", stage: "Negotiation", value: 310000, owner: "GM Somalia", probability: 70, closeDate: "2026-08-12" },
  { name: "Telecom Security Upgrade", country: "Djibouti", sector: "Telecom", stage: "Proposal", value: 240000, owner: "GM Djibouti", probability: 55, closeDate: "2026-09-10" },
];

type RawOpportunity = {
  name?: string | null;
  opportunity_name?: string | null;
  title?: string | null;
  company_name?: string | null;
  companyName?: string | null;
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
  owner?: {
    name?: string | null;
  } | string | null;
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
  close_date?: string | null;
  expected_close_date?: string | null;
  expectedCloseDate?: string | null;
  closeDate?: string | null;
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
  name: string;
  country: string;
  sector: string;
  stage: string;
  value: number;
  owner: string;
  probability: number;
  closeDate: string;
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

function normalizeStage(stage: RawOpportunity["stage"]) {
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
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Prospect";
}

function normalizeOpportunity(raw: RawOpportunity): Opportunity {
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
  const probability = raw.probability ?? raw.win_probability ?? raw.probability_percent ?? 0;
  const ownerValue = typeof raw.owner === "string" ? raw.owner : raw.owner?.name;
  return {
    name: raw.name ?? raw.opportunity_name ?? raw.title ?? raw.company_name ?? raw.companyName ?? "Unnamed",
    country:
      raw.country ??
      raw.country_name ??
      raw.countryName ??
      raw.tenant_country ??
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
    stage: normalizeStage(raw.stage ?? raw.status ?? raw.pipeline_stage ?? raw.pipelineStage ?? "Unknown"),
    value,
    owner:
      ownerValue ??
      raw.owner_name ??
      raw.ownerName ??
      raw.assigned_user_name ??
      raw.assigned_to ??
      raw.assignedTo ??
      raw.assigned_to_name ??
      raw.account_manager ??
      raw.accountManager ??
      raw.account_manager_name ??
      raw.owner_user?.name ??
      raw.user?.name ??
      (raw.owner_id ? "Account Manager" : "Unassigned"),
    probability,
    closeDate: raw.closeDate ?? raw.close_date ?? raw.expected_close_date ?? raw.expectedCloseDate ?? "",
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

function countryStatusClass(value: number) {
  if (value >= 800000) return "bg-green-100 text-green-700";
  if (value >= 500000) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function countryStatus(value: number) {
  if (value >= 800000) return "Strong";
  if (value >= 500000) return "Moderate";
  return "Weak";
}

function actionFor(opportunity: Opportunity) {
  if (opportunity.probability >= 70) return { label: "Push to close", className: "text-green-700" };
  if (opportunity.value >= 300000 && opportunity.probability < 60) return { label: "Executive review", className: "text-red-700" };
  return { label: "Monitor", className: "text-gray-500" };
}

function signalClass(tone: Signal["tone"]) {
  return tone === "red" ? "border-red-200 bg-red-50 text-red-800" : "border-yellow-200 bg-yellow-50 text-yellow-800";
}

export default function HOBPipelinePage() {
  const { data: session, status } = useSession();
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    fetch(`${API}/api/v1/leads`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Leads fetch failed");
        return response.json();
      })
      .then((json) => {
        const rows = unwrapList<RawOpportunity>(json.data ?? json, ["leads", "items"]);
        if (rows.length === 0) throw new Error("No leads returned");
        setOpportunities(rows.map(normalizeOpportunity));
      })
      .catch(() => setOpportunities(mockOpportunities));
  }, [status, session]);

  const totalPipeline = opportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const openOpportunities = opportunities.filter((opportunity) => !["Won", "Lost"].includes(opportunity.stage));
  const weightedForecast = opportunities.reduce((sum, opportunity) => sum + (opportunity.value * opportunity.probability) / 100, 0);
  const averageDealSize = openOpportunities.length > 0 ? totalPipeline / openOpportunities.length : 0;
  const negotiationValue = opportunities
    .filter((opportunity) => opportunity.stage === "Negotiation")
    .reduce((sum, opportunity) => sum + opportunity.value, 0);

  const countryRows = useMemo(() => {
    const map = opportunities.reduce((rows, opportunity) => {
      const current = rows.get(opportunity.country) ?? {
        country: opportunity.country,
        count: 0,
        largestDeal: 0,
        total: 0,
        weighted: 0,
      };
      current.count += 1;
      current.total += opportunity.value;
      current.weighted += (opportunity.value * opportunity.probability) / 100;
      current.largestDeal = Math.max(current.largestDeal, opportunity.value);
      rows.set(opportunity.country, current);
      return rows;
    }, new Map<string, { country: string; count: number; largestDeal: number; total: number; weighted: number }>());

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [opportunities]);

  const stageRows = useMemo(() => {
    return STAGES.map((stage) => {
      const stageOpportunities = opportunities.filter((opportunity) => opportunity.stage === stage);
      return {
        count: stageOpportunities.length,
        stage,
        total: stageOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0),
      };
    });
  }, [opportunities]);

  const sectorRows = useMemo(() => {
    const map = opportunities.reduce((rows, opportunity) => {
      const current = rows.get(opportunity.sector) ?? { sector: opportunity.sector, count: 0, total: 0, weighted: 0 };
      current.count += 1;
      current.total += opportunity.value;
      current.weighted += (opportunity.value * opportunity.probability) / 100;
      rows.set(opportunity.sector, current);
      return rows;
    }, new Map<string, { sector: string; count: number; total: number; weighted: number }>());

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [opportunities]);

  const weakPipelineCountries = countryRows.filter((country) => country.total < 500000).length;

  const signals = useMemo(() => {
    const rows: Signal[] = [];
    countryRows.forEach((country) => {
      if (country.total < 500000) {
        rows.push({ tone: "red", message: `${country.country} has weak pipeline coverage` });
      }
    });
    opportunities.forEach((opportunity) => {
      if (opportunity.value >= 300000 && opportunity.probability < 60) {
        rows.push({ tone: "red", message: `${opportunity.name} requires executive review` });
      }
    });
    if (negotiationValue > 500000) {
      rows.push({ tone: "yellow", message: "Negotiation stage contains high-value deals - close now" });
    }
    if (totalPipeline > 0 && weightedForecast < totalPipeline * 0.4) {
      rows.push({ tone: "yellow", message: "Forecast confidence is low" });
    }
    return rows;
  }, [countryRows, negotiationValue, opportunities, totalPipeline, weightedForecast]);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Commercial Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cross-country pipeline visibility, stage health, and commercial intervention priorities.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Total Pipeline Value" value={formatUSD(totalPipeline)} />
        <KpiCard label="Open Opportunities" value={openOpportunities.length.toString()} />
        <KpiCard label="Weighted Forecast" value={formatUSD(weightedForecast)} />
        <KpiCard label="Average Deal Size" value={formatUSD(averageDealSize)} />
        <KpiCard label="Negotiation Value" value={formatUSD(negotiationValue)} />
        <KpiCard label="Countries With Weak Pipeline" value={weakPipelineCountries.toString()} />
      </div>

      <Section title="Pipeline by Country" subtitle="Cross-country coverage and weighted forecast by commercial unit.">
        <Table minWidth="900px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Total Pipeline</th>
              <th className="py-3 pr-4 text-right font-medium">Opportunity Count</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Forecast</th>
              <th className="py-3 pr-4 text-right font-medium">Largest Deal</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {countryRows.map((country) => (
              <tr className="border-b last:border-0" key={country.country}>
                <td className="py-3 pr-4 font-medium text-gray-900">{country.country}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(country.total)}</td>
                <td className="py-3 pr-4 text-right">{country.count}</td>
                <td className="py-3 pr-4 text-right">{formatUSD(country.weighted)}</td>
                <td className="py-3 pr-4 text-right">{formatUSD(country.largestDeal)}</td>
                <td className="py-3 text-right">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${countryStatusClass(country.total)}`}>
                    {countryStatus(country.total)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Pipeline by Stage" subtitle="Stage distribution and value concentration across countries.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {stageRows.map((stage) => (
            <div className="rounded-lg border border-gray-200 p-4" key={stage.stage}>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageClass(stage.stage)}`}>{stage.stage}</span>
              <p className="mt-4 text-2xl font-semibold text-gray-900">{stage.count}</p>
              <p className="mt-1 text-sm text-gray-500">{formatUSD(stage.total)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pipeline by Sector" subtitle="Sector concentration and weighted revenue view.">
        <Table minWidth="860px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 text-right font-medium">Pipeline Value</th>
              <th className="py-3 pr-4 text-right font-medium">Opportunity Count</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Forecast</th>
              <th className="py-3 text-right font-medium">% of Total Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {sectorRows.map((sector) => (
              <tr className="border-b last:border-0" key={sector.sector}>
                <td className="py-3 pr-4 font-medium text-gray-900">{sector.sector}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(sector.total)}</td>
                <td className="py-3 pr-4 text-right">{sector.count}</td>
                <td className="py-3 pr-4 text-right">{formatUSD(sector.weighted)}</td>
                <td className="py-3 text-right">{totalPipeline > 0 ? ((sector.total / totalPipeline) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Strategic Opportunities" subtitle="High-value deals requiring HoB visibility or cross-country intervention.">
        <Table minWidth="1180px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Sector</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Value</th>
              <th className="py-3 pr-4 font-medium">Owner</th>
              <th className="py-3 pr-4 font-medium">Close Date</th>
              <th className="py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity) => {
              const action = actionFor(opportunity);
              return (
                <tr className="border-b last:border-0" key={`${opportunity.name}-${opportunity.country}-${opportunity.closeDate}`}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{opportunity.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{opportunity.country}</td>
                  <td className="py-3 pr-4">{opportunity.sector}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${stageClass(opportunity.stage)}`}>
                      {opportunity.stage}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                  <td className="py-3 pr-4 text-right">{opportunity.probability}%</td>
                  <td className="py-3 pr-4 text-right">{formatUSD((opportunity.value * opportunity.probability) / 100)}</td>
                  <td className="py-3 pr-4">{opportunity.owner}</td>
                  <td className="py-3 pr-4">{opportunity.closeDate}</td>
                  <td className={`py-3 text-right font-semibold ${action.className}`}>{action.label}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Commercial Intervention Signals" subtitle="Auto-generated alerts from pipeline coverage, value, and confidence.">
        <div className="space-y-3">
          {signals.length > 0 ? (
            signals.map((signal) => (
              <div className={`rounded-lg border p-3 text-sm font-medium ${signalClass(signal.tone)}`} key={signal.message}>
                {signal.message}
              </div>
            ))
          ) : (
            <p className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm text-[#0A9599]">
              Pipeline coverage is healthy.
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
