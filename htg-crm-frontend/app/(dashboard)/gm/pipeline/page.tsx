"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const stages = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

const mockLeads: LeadRow[] = [
  { name: "Banking Expansion", value: 450000, stage: "Proposal", sector: "Finance", owner: "AM 01", status: "Open" },
  { name: "Government Cloud", value: 300000, stage: "Qualified", sector: "Government", owner: "AM 02", status: "Open" },
  { name: "Telecom Backup", value: 220000, stage: "Negotiation", sector: "Telecom", owner: "AM 01", status: "Open" },
  { name: "Healthcare DR", value: 180000, stage: "Prospect", sector: "Healthcare", owner: "AM 03", status: "Open" },
];

type ApiEnvelope<T> = {
  data?: T | null;
};

type LeadRow = {
  id?: string;
  name?: string;
  company_name?: string;
  companyName?: string;
  value?: number;
  value_usd?: number;
  valueUsd?: number;
  potential_value_usd?: number;
  stage?: string | number;
  stage_name?: string;
  stage_number?: number;
  sector?: string;
  sector_name?: string;
  owner?: string;
  owner_name?: string;
  account_manager_name?: string;
  status?: string;
};

function unwrapLeads(value: LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] } | null | undefined) {
  if (Array.isArray(value)) return value;
  return value?.leads ?? value?.items ?? [];
}

function leadName(lead: LeadRow) {
  return lead.name ?? lead.company_name ?? lead.companyName ?? "Untitled opportunity";
}

function leadValue(lead: LeadRow) {
  return lead.value ?? lead.value_usd ?? lead.valueUsd ?? lead.potential_value_usd ?? 0;
}

function leadSector(lead: LeadRow) {
  return lead.sector ?? lead.sector_name ?? "Unassigned";
}

function leadOwner(lead: LeadRow) {
  return lead.owner ?? lead.owner_name ?? lead.account_manager_name ?? "Unassigned";
}

function leadStage(lead: LeadRow) {
  const text = String(lead.stage_name ?? lead.stage ?? "").toLowerCase();
  const number = lead.stage_number ?? (typeof lead.stage === "number" ? lead.stage : undefined);
  if (text.includes("won") || number === 9) return "Won";
  if (text.includes("lost") || number === 10) return "Lost";
  if (text.includes("negotiation") || (number ?? 0) >= 7) return "Negotiation";
  if (text.includes("proposal") || (number ?? 0) >= 5) return "Proposal";
  if (text.includes("qualified") || (number ?? 0) >= 3) return "Qualified";
  return "Prospect";
}

function stageClass(stage: string) {
  if (stage === "Won") return "bg-green-100 text-green-700";
  if (stage === "Lost") return "bg-gray-100 text-gray-700";
  if (stage === "Negotiation") return "bg-teal-100 text-teal-700";
  if (stage === "Proposal") return "bg-blue-100 text-blue-700";
  if (stage === "Qualified") return "bg-yellow-100 text-yellow-700";
  return "bg-purple-100 text-purple-700";
}

export default function GMPipelinePage() {
  const { data: session, status } = useSession();
  const [leads, setLeads] = useState<LeadRow[]>(mockLeads);

  const country =
    (session as { country?: string } | null)?.country ??
    (session as { user?: { country?: string } } | null)?.user?.country ??
    "Kenya";

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    fetch(`${API}/api/v1/leads?country=${encodeURIComponent(country)}`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Leads request failed: ${response.status}`);
        return response.json();
      })
      .then((json: ApiEnvelope<LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] }>) => {
        const rows = unwrapLeads(json.data);
        setLeads(rows.length ? rows : mockLeads);
      })
      .catch(() => setLeads(mockLeads));
  }, [country, session, status]);

  const totalPipeline = leads.reduce((sum, lead) => sum + leadValue(lead), 0);
  const averageDealSize = leads.length ? totalPipeline / leads.length : 0;
  const stageRows = useMemo(
    () =>
      stages.map((stage) => {
        const rows = leads.filter((lead) => leadStage(lead) === stage);
        return {
          stage,
          count: rows.length,
          value: rows.reduce((sum, lead) => sum + leadValue(lead), 0),
        };
      }),
    [leads],
  );

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Country Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Leads and opportunities across all stages in {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total Pipeline Value" value={formatUSD(totalPipeline)} />
        <KpiCard label="Open Deals" value={leads.filter((lead) => !["Won", "Lost"].includes(leadStage(lead))).length.toString()} />
        <KpiCard label="Average Deal Size" value={formatUSD(averageDealSize)} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Pipeline by Stage</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stageRows.map((row) => (
            <div className="rounded-lg border border-gray-200 p-4" key={row.stage}>
              <p className="text-sm font-medium text-gray-700">{row.stage}</p>
              <p className="mt-3 text-2xl font-semibold text-gray-900">{row.count}</p>
              <p className="mt-1 text-xs text-gray-500">{formatUSD(row.value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Full Leads Table</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Opportunity</th>
                <th className="py-3 pr-4 font-medium">Sector</th>
                <th className="py-3 pr-4 text-right font-medium">Stage</th>
                <th className="py-3 pr-4 text-right font-medium">Value</th>
                <th className="py-3 pr-4 font-medium">Owner</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => {
                const stage = leadStage(lead);
                return (
                  <tr className="border-b last:border-0" key={lead.id ?? `${leadName(lead)}-${index}`}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{leadName(lead)}</td>
                    <td className="py-3 pr-4 text-gray-500">{leadSector(lead)}</td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${stageClass(stage)}`}>{stage}</span>
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatUSD(leadValue(lead))}</td>
                    <td className="py-3 pr-4 text-gray-500">{leadOwner(lead)}</td>
                    <td className="py-3 text-right text-gray-500">{lead.status ?? (["Won", "Lost"].includes(stage) ? stage : "Open")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
