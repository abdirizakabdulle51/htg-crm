"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { countryNameByID } from "@/lib/countries";
import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    message?: string;
  } | null;
};

type UserProfile = {
  country_office_id?: string;
};

export default function GMApprovalsPage() {
  const { data: session, status } = useSession();
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
        const countryName = countryNameByID(profile?.country_office_id);
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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Approval Center</h1>
        <p className="mt-1 text-sm text-gray-500">Commercial approvals and review queue for {country}.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Pending Approvals" value="0" />
        <KpiCard label="Total Pending Value" value={formatUSD(0)} />
        <KpiCard label="Discounts Awaiting Review" value="0" />
        <KpiCard label="Strategic Escalations" value="0" />
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
              <tr>
                <td className="py-8 text-center text-sm text-gray-500" colSpan={7}>
                  No pending approvals. Approvals workflow coming soon.
                </td>
              </tr>
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
