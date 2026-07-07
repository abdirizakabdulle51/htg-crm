"use client";

import { useMemo } from "react";

import { formatUSD } from "@/lib/utils";

const approvals = [
  {
    type: "Strategic Discount",
    customer: "Kenya Tenant 01",
    country: "Kenya",
    value: 120000,
    submittedBy: "GM Kenya",
    reason: "Strategic pricing",
    status: "Pending",
    date: "2026-07-12",
  },
  {
    type: "Large Opportunity",
    customer: "Hormuud Telecom",
    country: "Somalia",
    value: 540000,
    submittedBy: "GM Somalia",
    reason: "Executive approval required",
    status: "Pending",
    date: "2026-07-14",
  },
  {
    type: "Commercial Exception",
    customer: "Ethiopia Tenant 02",
    country: "Ethiopia",
    value: 85000,
    submittedBy: "GM Ethiopia",
    reason: "Extended payment terms",
    status: "Under Review",
    date: "2026-07-15",
  },
  {
    type: "Strategic Renewal",
    customer: "Djibouti Tenant 02",
    country: "Djibouti",
    value: 260000,
    submittedBy: "GM Djibouti",
    reason: "Renewal incentive",
    status: "Pending",
    date: "2026-07-16",
  },
];

type Approval = (typeof approvals)[number];

function statusClass(status: Approval["status"]) {
  if (status === "Pending") return "bg-yellow-100 text-yellow-700";
  if (status === "Under Review") return "bg-blue-100 text-blue-700";
  if (status === "Approved") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

function priorityFor(value: number) {
  if (value >= 500000) return "Critical";
  if (value >= 250000) return "High";
  return "Medium";
}

function priorityClass(priority: string) {
  if (priority === "Critical") return "bg-red-100 text-red-700";
  if (priority === "High") return "bg-orange-100 text-orange-700";
  return "bg-yellow-100 text-yellow-700";
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function recommendationFor(approval: Approval) {
  if (approval.type === "Strategic Renewal") {
    return `Strategic Renewal for ${approval.country} should be approved before renewal date.`;
  }
  if (approval.type === "Large Opportunity") {
    return `Large Opportunity from ${approval.country} requires executive review.`;
  }
  if (approval.type === "Strategic Discount") {
    return `Strategic pricing request from ${approval.country} supports long-term ARR.`;
  }
  return `Commercial exception for ${approval.customer} - review payment terms carefully.`;
}

export default function HOBApprovalsPage() {
  const metrics = useMemo(() => {
    const pending = approvals.filter((approval) => approval.status === "Pending");
    const totalValue = approvals.reduce((sum, approval) => sum + approval.value, 0);

    return {
      averageApprovalValue: approvals.length > 0 ? totalValue / approvals.length : 0,
      commercialExceptions: approvals.filter((approval) => approval.type === "Commercial Exception").length,
      pendingApprovals: pending.length,
      pendingValue: pending.reduce((sum, approval) => sum + approval.value, 0),
      strategicDiscounts: approvals.filter((approval) => approval.type === "Strategic Discount").length,
      strategicRenewals: approvals.filter((approval) => approval.type === "Strategic Renewal").length,
    };
  }, []);

  const highValueApprovals = useMemo(
    () => approvals.filter((approval) => approval.value >= 250000),
    [],
  );

  const commercialExceptions = useMemo(
    () => approvals.filter((approval) => approval.type === "Commercial Exception"),
    [],
  );

  const summary = useMemo(() => {
    const highestValueApproval = [...approvals].sort((a, b) => b.value - a.value)[0];
    const countryCounts = approvals.reduce((map, approval) => {
      map.set(approval.country, (map.get(approval.country) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
    const countryWithMostRequests = Array.from(countryCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";
    const pendingCountries = approvals
      .filter((approval) => approval.status === "Pending")
      .sort((a, b) => b.value - a.value)
      .slice(0, 2)
      .map((approval) => approval.country);

    return {
      countryWithMostRequests,
      highestValueApproval,
      recommendation:
        pendingCountries.length > 0
          ? `Prioritize ${pendingCountries.join(" and ")} approvals this week.`
          : "No urgent approval decisions are pending this week.",
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Commercial Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review strategic pricing, commercial exceptions, and executive approval requests.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Pending Approvals" value={metrics.pendingApprovals.toString()} />
        <KpiCard label="Pending Value" value={formatUSD(metrics.pendingValue)} />
        <KpiCard label="Strategic Discounts" value={metrics.strategicDiscounts.toString()} />
        <KpiCard label="Commercial Exceptions" value={metrics.commercialExceptions.toString()} />
        <KpiCard label="Strategic Renewals" value={metrics.strategicRenewals.toString()} />
        <KpiCard label="Average Approval Value" value={formatUSD(metrics.averageApprovalValue)} />
      </div>

      <Section title="Approval Queue" subtitle="Company-wide commercial approval requests requiring HoB review.">
        <Table minWidth="1180px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Approval Type</th>
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 font-medium">Submitted By</th>
              <th className="py-3 pr-4 font-medium">Reason</th>
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((approval) => (
              <tr className="border-b last:border-0" key={`${approval.type}-${approval.customer}`}>
                <td className="py-3 pr-4 font-medium text-gray-900">{approval.type}</td>
                <td className="py-3 pr-4">{approval.customer}</td>
                <td className="py-3 pr-4 text-gray-500">{approval.country}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(approval.value)}</td>
                <td className="py-3 pr-4">{approval.submittedBy}</td>
                <td className="py-3 pr-4">{approval.reason}</td>
                <td className="py-3 pr-4">{formatDate(approval.date)}</td>
                <td className="py-3 pr-4">
                  <StatusBadge className={statusClass(approval.status)}>{approval.status}</StatusBadge>
                </td>
                <td className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white opacity-50"
                      disabled
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 opacity-50"
                      disabled
                      type="button"
                    >
                      Reject
                    </button>
                    <button
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 opacity-50"
                      disabled
                      type="button"
                    >
                      Request More Info
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="High Value Approvals" subtitle="Requests at or above $250,000 requiring executive attention.">
        <Table minWidth="760px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 font-medium">Reason</th>
              <th className="py-3 text-right font-medium">Priority</th>
            </tr>
          </thead>
          <tbody>
            {highValueApprovals.map((approval) => {
              const priority = priorityFor(approval.value);
              return (
                <tr className="border-b last:border-0" key={`${approval.customer}-high-value`}>
                  <td className="py-3 pr-4 font-medium text-gray-900">{approval.customer}</td>
                  <td className="py-3 pr-4 text-gray-500">{approval.country}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatUSD(approval.value)}</td>
                  <td className="py-3 pr-4">{approval.reason}</td>
                  <td className="py-3 text-right">
                    <StatusBadge className={priorityClass(priority)}>{priority}</StatusBadge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Section>

      <Section title="Commercial Exceptions" subtitle="Payment terms and commercial exceptions needing careful review.">
        <Table minWidth="760px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Country</th>
              <th className="py-3 pr-4 font-medium">Reason</th>
              <th className="py-3 pr-4 text-right font-medium">Requested Value</th>
              <th className="py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {commercialExceptions.map((approval) => (
              <tr className="border-b last:border-0" key={`${approval.customer}-exception`}>
                <td className="py-3 pr-4 font-medium text-gray-900">{approval.customer}</td>
                <td className="py-3 pr-4 text-gray-500">{approval.country}</td>
                <td className="py-3 pr-4">{approval.reason}</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(approval.value)}</td>
                <td className="py-3 text-right">
                  <StatusBadge className={statusClass(approval.status)}>{approval.status}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      <Section title="Approval Recommendations" subtitle="Auto-generated guidance for the current approval queue.">
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              className="rounded-lg border border-[#0A9599]/20 bg-[#0A9599]/5 p-3 text-sm font-medium text-[#0A9599]"
              key={`${approval.customer}-recommendation`}
            >
              {recommendationFor(approval)}
            </div>
          ))}
        </div>
      </Section>

      <section className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0A9599]">Executive Decision Summary</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Pending Count" value={metrics.pendingApprovals.toString()} />
          <SummaryMetric
            label="Highest Value Approval"
            value={`${summary.highestValueApproval.customer} - ${formatUSD(summary.highestValueApproval.value)}`}
          />
          <SummaryMetric label="Country With Most Requests" value={summary.countryWithMostRequests} />
          <SummaryMetric label="Average Approval Size" value={formatUSD(metrics.averageApprovalValue)} />
        </div>
        <p className="mt-5 text-sm text-gray-700">{summary.recommendation}</p>
      </section>
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

function StatusBadge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 font-semibold text-gray-900">{value}</p>
    </div>
  );
}
