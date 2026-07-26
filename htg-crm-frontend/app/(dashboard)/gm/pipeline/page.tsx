"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { countryNameByID } from "@/lib/countries";
import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const stages = ["Prospect", "Qualified", "Proposal", "Negotiation", "Won", "Lost"];

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    message?: string;
  } | null;
};

type UserProfile = {
  country_office_id?: string;
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
  if (text.includes("negotiation") || (number ?? 0) >= 6) return "Negotiation";
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
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    let cancelled = false;
    async function fetchJson<T>(url: string): Promise<T> {
      const response = await fetch(`${API}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const body = (await response.json()) as ApiEnvelope<T> | T;
      if (!response.ok) {
        const envelope = body as ApiEnvelope<T>;
        throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
      }
      if (body && typeof body === "object" && "data" in body) return (body as ApiEnvelope<T>).data as T;
      return body as T;
    }

    async function loadPipeline() {
      setLoading(true);
      setLoadError("");
      try {
        const profile = await fetchJson<UserProfile>("/api/v1/me");
        const countryName = countryNameByID(profile.country_office_id);
        if (!countryName) throw new Error("GM profile is missing a country assignment");
        const rows = await fetchJson<LeadRow[] | { leads?: LeadRow[]; items?: LeadRow[] }>("/api/v1/leads");
        if (cancelled) return;
        setCountry(countryName);
        setLeads(unwrapLeads(rows));
      } catch (error) {
        if (cancelled) return;
        setCountry("");
        setLeads([]);
        setLoadError(error instanceof Error ? error.message : "Unable to load country pipeline.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPipeline();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

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

  if (status === "loading" || loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;
  if (loadError || !country) return <div className="p-8 text-gray-500">{loadError || "No country assignment found for this GM."}</div>;

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
        {!leads.length && <p className="py-8 text-sm text-gray-500">No leads found for {country}.</p>}
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
