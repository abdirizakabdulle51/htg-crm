"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";
const COUNTRY_BY_ID: Record<string, string> = {
  "029d3da0-19a7-4bd1-8dbb-a915bef8055e": "Somalia",
  "30f5c442-ada7-4f06-9e42-69dcf2eb195b": "Kenya",
  "d064f0d3-2833-485a-a864-44e6beb76f34": "Ethiopia",
  "25d20433-056d-413b-9a3c-362a730f3c0a": "Djibouti",
};

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    message?: string;
  } | null;
};

type UserProfile = {
  country_office_id?: string;
};

// TODO: mock - needs backend
const mockAMs = [
  { name: "AM 01", tenants: 2, arr: 930000, pipeline: 670000, achievement: 88, atRisk: 1, status: "On Track" },
  { name: "AM 02", tenants: 2, arr: 720000, pipeline: 300000, achievement: 72, atRisk: 0, status: "On Track" },
  { name: "AM 03", tenants: 2, arr: 450000, pipeline: 180000, achievement: 54, atRisk: 0, status: "Behind" },
];

function achievementClass(value: number) {
  if (value >= 80) return "text-green-700";
  if (value >= 60) return "text-yellow-700";
  return "text-red-700";
}

function statusClass(status: string) {
  if (status === "On Track") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

export default function GMTeamPage() {
  const { data: session, status } = useSession();
  const [accountManagers] = useState(mockAMs);
  const [country, setCountry] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
    if (!token) return;

    let cancelled = false;
    async function loadProfile() {
      setLoadError("");
      try {
        const response = await fetch(`${API}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        const body = (await response.json()) as ApiEnvelope<UserProfile> | UserProfile;
        if (!response.ok) {
          const envelope = body as ApiEnvelope<UserProfile>;
          throw new Error(envelope.error?.message ?? `Request failed: ${response.status}`);
        }
        const profile = body && typeof body === "object" && "data" in body ? (body as ApiEnvelope<UserProfile>).data : (body as UserProfile);
        const countryName = profile?.country_office_id ? COUNTRY_BY_ID[profile.country_office_id] : "";
        if (!countryName) throw new Error("GM profile is missing a country assignment");
        if (!cancelled) setCountry(countryName);
      } catch {
        if (!cancelled) setLoadError("Unable to load GM country.");
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;
  if (loadError || !country) return <div className="p-8 text-gray-500">{loadError || "No country assignment found for this GM."}</div>;

  const totalARR = accountManagers.reduce((sum, am) => sum + am.arr, 0);
  const averageAchievement =
    accountManagers.length > 0
      ? accountManagers.reduce((sum, am) => sum + am.achievement, 0) / accountManagers.length
      : 0;
  const atRiskOwned = accountManagers.reduce((sum, am) => sum + am.atRisk, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Team Performance</h1>
        <p className="mt-1 text-sm text-gray-500">Account Manager execution view for {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Account Managers" value={accountManagers.length.toString()} />
        <KpiCard label="Total ARR Managed" value={formatUSD(totalARR)} />
        <KpiCard label="Average Achievement %" value={`${averageAchievement.toFixed(0)}%`} />
        <KpiCard label="At-Risk Accounts Owned" value={atRiskOwned.toString()} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Account Manager Table</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">AM Name</th>
                <th className="py-3 pr-4 text-right font-medium">Assigned Tenants</th>
                <th className="py-3 pr-4 text-right font-medium">ARR Managed</th>
                <th className="py-3 pr-4 text-right font-medium">Pipeline Value</th>
                <th className="py-3 pr-4 text-right font-medium">Achievement %</th>
                <th className="py-3 pr-4 text-right font-medium">At-Risk Tenants</th>
                <th className="py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {accountManagers.map((am) => (
                <tr className="border-b last:border-0" key={am.name}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{am.name}</td>
                  <td className="py-3 pr-4 text-right">{am.tenants}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(am.arr)}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(am.pipeline)}</td>
                  <td className={`py-3 pr-4 text-right font-semibold ${achievementClass(am.achievement)}`}>
                    {am.achievement}%
                  </td>
                  <td className="py-3 pr-4 text-right">{am.atRisk}</td>
                  <td className="py-3 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(am.status)}`}>
                      {am.status}
                    </span>
                  </td>
                </tr>
              ))}
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
