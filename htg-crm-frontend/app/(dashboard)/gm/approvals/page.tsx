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
const mockApprovals = [
  { type: "Proposal", account: "Kenya Tenant 03", value: 180000, submittedBy: "AM 02", date: "2026-07-01", status: "Pending" },
  { type: "Discount", account: "Kenya Tenant 04", value: 15000, submittedBy: "AM 01", date: "2026-07-03", status: "Pending" },
  { type: "Strategic Escalation", account: "Kenya Tenant 01", value: 720000, submittedBy: "AM 01", date: "2026-07-05", status: "Under Review" },
];

function statusClass(status: string) {
  if (status === "Pending") return "bg-yellow-100 text-yellow-700";
  if (status === "Under Review") return "bg-blue-100 text-blue-700";
  if (status === "Approved") return "bg-green-100 text-green-700";
  if (status === "Rejected") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function GMApprovalsPage() {
  const { data: session, status } = useSession();
  const [approvals] = useState(mockApprovals);
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
      } catch (error) {
        if (cancelled) return;
        setCountry("");
        setLoadError(error instanceof Error ? error.message : "Unable to load GM profile.");
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

  const pendingApprovals = approvals.filter((approval) => approval.status === "Pending");
  const pendingValue = pendingApprovals.reduce((sum, approval) => sum + approval.value, 0);
  const discountCount = approvals.filter((approval) => approval.type === "Discount").length;
  const escalationCount = approvals.filter((approval) => approval.type === "Strategic Escalation").length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Approval Center</h1>
        <p className="mt-1 text-sm text-gray-500">Commercial approvals and review queue for {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending Approvals" value={pendingApprovals.length.toString()} />
        <KpiCard label="Total Pending Value" value={formatUSD(pendingValue)} />
        <KpiCard label="Discounts Awaiting Review" value={discountCount.toString()} />
        <KpiCard label="Strategic Escalations" value={escalationCount.toString()} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Approval Table</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Account</th>
                <th className="py-3 pr-4 text-right font-medium">Value</th>
                <th className="py-3 pr-4 font-medium">Submitted By</th>
                <th className="py-3 pr-4 text-right font-medium">Date</th>
                <th className="py-3 pr-4 text-right font-medium">Status</th>
                <th className="py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => (
                <tr className="border-b last:border-0" key={`${approval.type}-${approval.account}`}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{approval.type}</td>
                  <td className="py-3 pr-4 text-gray-700">{approval.account}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(approval.value)}</td>
                  <td className="py-3 pr-4 text-gray-500">{approval.submittedBy}</td>
                  <td className="py-3 pr-4 text-right text-gray-500">{formatDate(approval.date)}</td>
                  <td className="py-3 pr-4 text-right">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(approval.status)}`}>
                      {approval.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-400"
                        disabled
                        type="button"
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-400"
                        disabled
                        type="button"
                      >
                        Reject
                      </button>
                    </div>
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
