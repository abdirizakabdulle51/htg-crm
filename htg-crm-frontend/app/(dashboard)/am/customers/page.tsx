"use client";

import { Suspense, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, CalendarClock, HeartPulse, Search, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";
import type { Tenant } from "@/types/crm";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

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
  country_name?: string | null;
  countryName?: string | null;
  tenant_country?: string | null;
  health_score?: number | null;
  healthScore?: number | null;
};

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

function unwrapList<T>(value: T[] | { items?: T[]; tenants?: T[] } | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value?.items ?? value?.tenants ?? [];
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

function scopedCustomers(tenants: TenantWithExtras[], amName: string, amId: string) {
  const assignedCustomers = assignedTenants(tenants, amName, amId);
  if (assignedCustomers.length > 0) return assignedCustomers;

  const kenyaCustomers = tenants
    .filter((tenant) => tenantCountry(tenant).toLowerCase() === "kenya")
    .slice(0, 5);

  return kenyaCustomers.length > 0 ? kenyaCustomers : tenants.slice(0, 5);
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

function healthClass(score: number) {
  if (score >= 80) return "bg-green-100 text-green-700";
  if (score >= 60) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function riskClass(score: number) {
  if (score > 50) return "bg-red-100 text-red-700";
  if (score >= 20) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function statusClass(status?: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "AT_RISK") return "bg-red-100 text-red-700";
  if (status === "PROSPECT") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-600";
}

function nextAction(tenant: TenantWithExtras) {
  const health = tenantHealthScore(tenant);
  const days = daysUntil(tenantRenewalDate(tenant));
  const risk = tenant.risk_score ?? 0;

  if (risk > 50) return "Schedule retention call";
  if (days !== null && days >= 0 && days <= 90) return "Prepare renewal plan";
  if (health >= 85) return "Identify expansion";
  return "Maintain relationship";
}

function attentionReason(tenant: TenantWithExtras) {
  const health = tenantHealthScore(tenant);
  const days = daysUntil(tenantRenewalDate(tenant));
  const risk = tenant.risk_score ?? 0;

  if (risk > 50) return `Risk score ${risk}`;
  if (days !== null && days >= 0 && days <= 90) return `Renewal in ${days} days`;
  if (health < 70) return `Health score ${health.toFixed(0)}`;
  return "Needs review";
}

function suggestedOffer(sector: string) {
  if (sector === "Telecom") return "Cloud Security Package";
  if (sector === "Finance") return "Disaster Recovery";
  if (sector === "Government") return "Hybrid Cloud";
  if (sector === "Logistics") return "Data Analytics";
  if (sector === "Healthcare") return "Cloud Backup";
  return "Cloud Optimization";
}

function expansionPriority(arr: number) {
  if (arr >= 500000) return "High";
  if (arr >= 250000) return "Medium";
  return "Low";
}

function priorityClass(priority: string) {
  if (priority === "High") return "bg-red-100 text-red-700";
  if (priority === "Medium") return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function domId(prefix: string, value: string) {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function queryHref(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `${path}?${query.toString()}`;
}

function customerContextHref(tenant: TenantWithExtras) {
  // Some fallback/demo records may lack a persistent tenant ID; keep those rows on the generic page rather than inventing one.
  return tenant.id ? queryHref("/am/customers", { customer: tenant.id }) : "/am/customers";
}

function customerOpportunitiesHref(tenant: TenantWithExtras) {
  return tenant.id ? queryHref("/am/opportunities", { customer: tenant.id }) : "/am/opportunities";
}

function customerNewOpportunityHref(tenant: TenantWithExtras) {
  return tenant.id ? queryHref("/am/opportunities", { customer: tenant.id, action: "create" }) : "/am/opportunities";
}

function customerRenewalsHref(tenant: TenantWithExtras) {
  return tenant.id ? queryHref("/am/renewals", { tenant: tenant.id }) : "/am/renewals";
}

function AMCustomersContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantsData, setTenantsData] = useState<TenantWithExtras[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sectorFilter, setSectorFilter] = useState("All");

  const amName =
    (session as { user?: { name?: string | null } } | null)?.user?.name ??
    (session as { name?: string | null } | null)?.name ??
    "Account Manager";
  const amId =
    (session as { user?: { id?: string | null } } | null)?.user?.id ??
    (session as { id?: string | null } | null)?.id ??
    "";
  const selectedCustomerId = searchParams.get("customer") ?? "";
  const selectedAction = searchParams.get("action") ?? "";

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    async function loadCustomers() {
      const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

      try {
        const tenantsResponse = await fetchJson<TenantWithExtras[] | { tenants?: TenantWithExtras[]; items?: TenantWithExtras[] }>(
          "/api/v1/tenants",
          token,
        );
        const tenants = unwrapList<TenantWithExtras>(tenantsResponse);
        if (!cancelled) setTenantsData(tenants.length ? tenants : mockTenants);
      } catch (error) {
        console.error("AM customers fetch failed", error);
        if (!cancelled) setTenantsData(mockTenants);
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [session, status]);

  const myCustomers = useMemo(() => scopedCustomers(tenantsData, amName, amId), [amId, amName, tenantsData]);
  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? myCustomers.find((tenant) => tenant.id === selectedCustomerId) : undefined),
    [myCustomers, selectedCustomerId],
  );
  const selectedCustomerMissing = Boolean(selectedCustomerId && tenantsData.length && !selectedCustomer);
  const sectors = useMemo(() => ["All", ...Array.from(new Set(myCustomers.map(tenantSector))).sort()], [myCustomers]);
  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return myCustomers.filter((tenant) => {
      const matchesSearch =
        !query ||
        tenant.name.toLowerCase().includes(query) ||
        tenantSector(tenant).toLowerCase().includes(query) ||
        tenantCountry(tenant).toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || tenant.status === statusFilter;
      const matchesSector = sectorFilter === "All" || tenantSector(tenant) === sectorFilter;

      return matchesSearch && matchesStatus && matchesSector;
    });
  }, [myCustomers, search, sectorFilter, statusFilter]);

  const managedARR = myCustomers.reduce((sum, tenant) => sum + tenantARR(tenant), 0);
  const averageHealth =
    myCustomers.length > 0
      ? myCustomers.reduce((sum, tenant) => sum + tenantHealthScore(tenant), 0) / myCustomers.length
      : 0;
  const atRiskCustomers = myCustomers.filter((tenant) => (tenant.risk_score ?? 0) > 50);
  const renewalRows = myCustomers
    .map((tenant) => ({ tenant, days: daysUntil(tenantRenewalDate(tenant)) }))
    .filter((row): row is { tenant: TenantWithExtras; days: number } => row.days !== null && row.days >= 0)
    .sort((a, b) => a.days - b.days);
  const renewalsDue = renewalRows.filter((row) => row.days <= 90);
  const expansionCustomers = myCustomers.filter((tenant) => tenantHealthScore(tenant) >= 80 && (tenant.risk_score ?? 0) < 20);
  const attentionCustomers = myCustomers.filter((tenant) => {
    const health = tenantHealthScore(tenant);
    const days = daysUntil(tenantRenewalDate(tenant));
    return (tenant.risk_score ?? 0) > 50 || (days !== null && days >= 0 && days <= 90) || health < 70;
  });
  const bestCustomer = [...myCustomers].sort((a, b) => tenantHealthScore(b) - tenantHealthScore(a))[0];
  const highestRiskCustomer = [...myCustomers].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))[0];
  const nextRenewal = renewalsDue[0];
  const expansionCandidate = [...expansionCustomers].sort((a, b) => tenantARR(b) - tenantARR(a))[0];
  const coachRecommendation =
    highestRiskCustomer && expansionCandidate
      ? `Focus on retaining ${highestRiskCustomer.name} while expanding ${expansionCandidate.name}.`
      : highestRiskCustomer
        ? `Prioritize a retention plan for ${highestRiskCustomer.name}.`
        : expansionCandidate
          ? `Start an expansion conversation with ${expansionCandidate.name}.`
          : "Maintain relationship coverage and keep renewal plans current.";

  useEffect(() => {
    if (!selectedCustomer) return;
    document.getElementById(domId("am-customer", selectedCustomer.id))?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [selectedCustomer]);

  function clearCustomerSelection() {
    router.push("/am/customers");
  }

  function selectCustomer(tenant: TenantWithExtras) {
    router.push(customerContextHref(tenant));
  }

  function handleCustomerKeyDown(event: KeyboardEvent<HTMLElement>, tenant: TenantWithExtras) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectCustomer(tenant);
  }

  if (status === "loading") return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">My Customers</h1>
        <p className="mt-1 text-sm text-gray-500">Manage assigned customers, health, renewals, risks, and relationship priorities.</p>
      </div>

      {selectedCustomer && (
        <div className="rounded-lg border border-[#0A9599]/40 bg-[#0A9599]/5 p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0A9599]">Selected customer</p>
              <h2 className="mt-1 text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
              <p className="mt-1 text-sm text-gray-600">
                Health {tenantHealthScore(selectedCustomer).toFixed(0)} · Risk {selectedCustomer.risk_score ?? 0} · {formatUSD(tenantARR(selectedCustomer))} ARR
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {selectedAction === "review-risk" ? "Review customer risk and relationship priority." : nextAction(selectedCustomer)}
              </p>
            </div>
            <button
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#0A9599]/40 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
              onClick={clearCustomerSelection}
              type="button"
            >
              Clear selection
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CustomerDetail label="Country" value={tenantCountry(selectedCustomer) || "Unassigned"} />
            <CustomerDetail label="Sector" value={tenantSector(selectedCustomer)} />
            <CustomerDetail label="ARR" value={formatUSD(tenantARR(selectedCustomer))} />
            <CustomerDetail label="MRR" value={formatUSD(tenantMRR(selectedCustomer))} />
            <CustomerDetail label="Health Score" value={`${tenantHealthScore(selectedCustomer).toFixed(0)}%`} />
            <CustomerDetail label="Risk Score" value={`${selectedCustomer.risk_score ?? 0}`} />
            <CustomerDetail label="Renewal Date" value={formatDate(tenantRenewalDate(selectedCustomer))} />
            <CustomerDetail label="Status" value={selectedCustomer.status ?? "UNKNOWN"} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#0A9599] hover:text-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
              onClick={() => router.push(customerOpportunitiesHref(selectedCustomer))}
              type="button"
            >
              Open Opportunities
            </button>
            <button
              className="rounded-lg bg-[#0A9599] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#087d80] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
              onClick={() => router.push(customerNewOpportunityHref(selectedCustomer))}
              type="button"
            >
              New Opportunity
            </button>
            <button
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-[#0A9599] hover:text-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
              onClick={() => router.push(customerRenewalsHref(selectedCustomer))}
              type="button"
            >
              View Renewals
            </button>
          </div>
        </div>
      )}

      {selectedCustomerMissing && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Customer not found.</span>
            <button className="font-semibold underline" onClick={clearCustomerSelection} type="button">
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={Users} label="My Customers" value={myCustomers.length.toString()} />
        <KpiCard icon={TrendingUp} label="Managed ARR" value={formatUSD(managedARR)} />
        <KpiCard icon={HeartPulse} label="Average Health" value={`${averageHealth.toFixed(0)}%`} />
        <KpiCard icon={AlertTriangle} label="At-Risk Customers" value={atRiskCustomers.length.toString()} />
        <KpiCard icon={CalendarClock} label="Renewals Due" value={renewalsDue.length.toString()} />
        <KpiCard icon={TrendingUp} label="Expansion Ready" value={expansionCustomers.length.toString()} />
      </div>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Search and Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by customer, sector, or country"
                type="search"
                value={search}
              />
            </label>
            <select
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="All">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="AT_RISK">At Risk</option>
              <option value="PROSPECT">Prospect</option>
            </select>
            <select
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSectorFilter(event.target.value)}
              value={sectorFilter}
            >
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector === "All" ? "All sectors" : sector}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle>Customer Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-3 pr-4 font-medium">Customer</th>
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 pr-4 text-right font-medium">ARR</th>
                  <th className="py-3 pr-4 text-right font-medium">MRR</th>
                  <th className="py-3 pr-4 text-right font-medium">Health</th>
                  <th className="py-3 pr-4 text-right font-medium">Risk</th>
                  <th className="py-3 pr-4 font-medium">Renewal</th>
                  <th className="py-3 pr-4 text-right font-medium">Status</th>
                  <th className="py-3 font-medium">Next Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((tenant) => {
                  const health = tenantHealthScore(tenant);
                  const risk = tenant.risk_score ?? 0;

                  return (
                    <tr
                      className={`scroll-mt-24 cursor-pointer border-b transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-inset last:border-0 ${
                        selectedCustomer?.id === tenant.id ? "bg-teal-50 ring-1 ring-inset ring-teal-500" : ""
                      }`}
                      id={domId("am-customer", tenant.id)}
                      key={tenant.id}
                      onClick={() => selectCustomer(tenant)}
                      onKeyDown={(event) => handleCustomerKeyDown(event, tenant)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">{tenant.name}</td>
                      <td className="py-3 pr-4 text-gray-500">{tenantCountry(tenant) || "Unassigned"}</td>
                      <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3 pr-4 text-right">{formatUSD(tenantMRR(tenant))}</td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={healthClass(health)}>{health.toFixed(0)}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={riskClass(risk)}>{risk}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{formatDate(tenantRenewalDate(tenant))}</td>
                      <td className="py-3 pr-4 text-right">
                        <Badge className={statusClass(tenant.status)}>{tenant.status ?? "UNKNOWN"}</Badge>
                      </td>
                      <td className="py-3">{nextAction(tenant)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filteredCustomers.length && <p className="py-8 text-sm text-gray-500">No customers match the current filters.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Customers Needing Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4 font-medium">Customer</th>
                    <th className="py-3 pr-4 font-medium">Reason</th>
                    <th className="py-3 pr-4 text-right font-medium">ARR</th>
                    <th className="py-3 font-medium">Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attentionCustomers.map((tenant) => (
                    <tr
                      className={`cursor-pointer border-b transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-inset last:border-0 ${
                        selectedCustomer?.id === tenant.id ? "bg-teal-50 ring-1 ring-inset ring-teal-500" : ""
                      }`}
                      key={tenant.id}
                      onClick={() => selectCustomer(tenant)}
                      onKeyDown={(event) => handleCustomerKeyDown(event, tenant)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                      <td className="py-3 pr-4 text-gray-500">{attentionReason(tenant)}</td>
                      <td className="py-3 pr-4 text-right font-semibold">{formatUSD(tenantARR(tenant))}</td>
                      <td className="py-3">{nextAction(tenant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!attentionCustomers.length && <p className="py-6 text-sm text-gray-500">No customers need immediate attention.</p>}
          </CardContent>
        </Card>

        <Card className="bg-white rounded-lg shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle>Expansion Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-3 pr-4 font-medium">Customer</th>
                    <th className="py-3 pr-4 font-medium">Sector</th>
                    <th className="py-3 pr-4 text-right font-medium">ARR</th>
                    <th className="py-3 pr-4 font-medium">Suggested Offer</th>
                    <th className="py-3 pr-4 text-right font-medium">Estimated Upsell</th>
                    <th className="py-3 text-right font-medium">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {expansionCustomers.map((tenant) => {
                    const arr = tenantARR(tenant);
                    const priority = expansionPriority(arr);

                    return (
                      <tr
                        className={`cursor-pointer border-b transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-inset last:border-0 ${
                          selectedCustomer?.id === tenant.id ? "bg-teal-50 ring-1 ring-inset ring-teal-500" : ""
                        }`}
                        key={tenant.id}
                        onClick={() => selectCustomer(tenant)}
                        onKeyDown={(event) => handleCustomerKeyDown(event, tenant)}
                        role="button"
                        tabIndex={0}
                      >
                        <td className="py-3 pr-4 font-medium">{tenant.name}</td>
                        <td className="py-3 pr-4 text-gray-500">{tenantSector(tenant)}</td>
                        <td className="py-3 pr-4 text-right font-semibold">{formatUSD(arr)}</td>
                        <td className="py-3 pr-4">{suggestedOffer(tenantSector(tenant))}</td>
                        <td className="py-3 pr-4 text-right font-semibold">{formatUSD(arr * 0.15)}</td>
                        <td className="py-3 text-right">
                          <Badge className={priorityClass(priority)}>{priority}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!expansionCustomers.length && <p className="py-6 text-sm text-gray-500">No expansion-ready customers yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
        <CardHeader>
          <CardTitle className="text-[#0A9599]">Customer Coach</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-5">
          <CoachMetric label="Best customer" onClick={bestCustomer ? () => selectCustomer(bestCustomer) : undefined} value={bestCustomer ? bestCustomer.name : "No customer"} />
          <CoachMetric
            label="Highest risk customer"
            onClick={highestRiskCustomer ? () => selectCustomer(highestRiskCustomer) : undefined}
            value={highestRiskCustomer ? `${highestRiskCustomer.name} (${highestRiskCustomer.risk_score ?? 0})` : "No risk"}
          />
          <CoachMetric
            label="Next renewal"
            onClick={nextRenewal ? () => selectCustomer(nextRenewal.tenant) : undefined}
            value={nextRenewal ? `${nextRenewal.tenant.name} (${nextRenewal.days} days)` : "No renewal due"}
          />
          <CoachMetric
            label="Expansion candidate"
            onClick={expansionCandidate ? () => selectCustomer(expansionCandidate) : undefined}
            value={expansionCandidate ? expansionCandidate.name : "No candidate"}
          />
          <div className="rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm lg:col-span-5">{coachRecommendation}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AMCustomersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <AMCustomersContent />
    </Suspense>
  );
}

function CustomerDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
    </div>
  );
}

function CoachMetric({ label, onClick, value }: { label: string; onClick?: () => void; value: string }) {
  const content = (
    <>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        className="rounded-lg border border-[#0A9599]/20 bg-white p-4 text-left transition hover:border-[#0A9599] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      {content}
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
