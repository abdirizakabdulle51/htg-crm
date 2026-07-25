"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, Edit3, Plus, Target, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatUSD } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const STAGE_LABELS: Record<number, string> = {
  1: "New Lead",
  2: "Qualified",
  3: "Discovery",
  4: "Solution Fit",
  5: "Proposal",
  6: "Negotiation",
  7: "Procurement",
  8: "Contracting",
  9: "Won",
  10: "Lost",
  11: "Dormant",
};

const CREATE_STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
const BOARD_STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const CLOSED_STAGES = new Set([9, 10, 11]);

type ApiEnvelope<T> = {
  data?: T | null;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  } | null;
  meta?: unknown;
};

type ApiError = {
  status: number;
  code: string;
  message: string;
};

type RawLead = {
  id?: string | null;
  tenant_id?: string | null;
  tenantId?: string | null;
  owner_id?: string | null;
  country_id?: string | null;
  region_id?: string | null;
  sector_id?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  stage?: string | number | null;
  stage_number?: number | null;
  stage_name?: string | null;
  status?: string | null;
  value_usd?: number | null;
  value?: number | null;
  probability?: number | null;
  expected_close_date?: string | null;
  source?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  competitor?: string | null;
  won_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Opportunity = {
  id: string;
  tenantId: string;
  ownerId: string;
  countryId: string;
  regionId: string;
  sectorId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  stageNumber: number;
  stageName: string;
  status: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  source: string;
  notes: string;
};

type RawTenant = {
  id?: string | null;
  name?: string | null;
  country_id?: string | null;
  region_id?: string | null;
  sector_id?: string | null;
  country?: string | null;
  sector?: string | null;
  account_manager_id?: string | null;
};

type TenantOption = {
  id: string;
  name: string;
  countryId: string;
  regionId: string;
  sectorId: string;
  country: string;
  sector: string;
};

type UserProfile = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type OpportunityForm = {
  tenantId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  stage: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
  source: string;
  notes: string;
};

type EditForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  value: string;
  probability: string;
  expectedCloseDate: string;
  source: string;
  notes: string;
};

type StageAction = "next" | "won" | "lost" | "dormant";

type StageForm = {
  action: StageAction;
  reason: string;
  competitor: string;
  confirmed: boolean;
};

const emptyOpportunityForm: OpportunityForm = {
  tenantId: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  stage: "1",
  value: "",
  probability: "20",
  expectedCloseDate: "",
  source: "",
  notes: "",
};

const emptyStageForm: StageForm = {
  action: "next",
  reason: "",
  competitor: "",
  confirmed: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function unwrapData<T>(value: unknown): T {
  if (isRecord(value) && "data" in value && "error" in value) {
    return value.data as T;
  }

  return value as T;
}

function unwrapList<T>(value: unknown, keys: string[]): T[] {
  const data = unwrapData<unknown>(value);

  if (Array.isArray(data)) return data as T[];
  if (!isRecord(data)) return [];

  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key] as T[];
  }

  return [];
}

async function fetchJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const envelope = body as ApiEnvelope<T> | null;
    throw {
      status: response.status,
      code: envelope?.error?.code ?? "REQUEST_FAILED",
      message: envelope?.error?.message ?? `Request failed with status ${response.status}`,
    } satisfies ApiError;
  }

  return unwrapData<T>(body);
}

function apiErrorMessage(error: unknown, notFoundMessage = "The requested resource could not be found.") {
  const apiError = error as Partial<ApiError>;
  if (apiError.status === 401) return "Your session expired or the API rejected the token. Please sign in again.";
  if (apiError.status === 403) return "You do not have permission to manage this opportunity.";
  if (apiError.status === 404) return notFoundMessage;
  if (apiError.status === 422) return apiError.message ?? "Please check the form fields and try again.";
  return apiError.message ?? "Something went wrong. Please try again.";
}

function sessionUserId(session: unknown) {
  if (!isRecord(session)) return "";
  const user = isRecord(session.user) ? session.user : {};

  return firstString([
    session.crmUserId,
    session.userId,
    session.id,
    user.crmUserId,
    user.userId,
    user.id,
    user.sub,
  ]);
}

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function normalizeLead(raw: RawLead): Opportunity {
  const stageNumber = normalizeStageNumber(raw.stage_number ?? raw.stage ?? raw.status);

  return {
    id: raw.id ?? "",
    tenantId: raw.tenant_id ?? raw.tenantId ?? "",
    ownerId: raw.owner_id ?? "",
    countryId: raw.country_id ?? "",
    regionId: raw.region_id ?? "",
    sectorId: raw.sector_id ?? "",
    companyName: raw.company_name ?? "Unnamed opportunity",
    contactName: raw.contact_name ?? "",
    contactEmail: raw.contact_email ?? "",
    contactPhone: raw.contact_phone ?? "",
    stageNumber,
    stageName: raw.stage_name ?? STAGE_LABELS[stageNumber] ?? "Unknown",
    status: raw.status ?? "UNKNOWN",
    value: numberValue(raw.value_usd ?? raw.value),
    probability: normalizeProbability(raw.probability),
    expectedCloseDate: dateInputValue(raw.expected_close_date),
    source: raw.source ?? "",
    notes: raw.notes ?? "",
  };
}

function normalizeTenant(raw: RawTenant): TenantOption | null {
  if (!raw.id || !raw.name) return null;

  return {
    id: raw.id,
    name: raw.name,
    countryId: raw.country_id ?? "",
    regionId: raw.region_id ?? "",
    sectorId: raw.sector_id ?? "",
    country: raw.country ?? "Unassigned",
    sector: raw.sector ?? "Unassigned",
  };
}

function normalizeStageNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.min(11, Math.round(value)));

  const normalized = String(value ?? "").replace(/_/g, " ").toLowerCase();
  if (normalized.includes("won")) return 9;
  if (normalized.includes("lost")) return 10;
  if (normalized.includes("dormant")) return 11;
  if (normalized.includes("contract")) return 8;
  if (normalized.includes("procurement")) return 7;
  if (normalized.includes("negotiation")) return 6;
  if (normalized.includes("proposal")) return 5;
  if (normalized.includes("solution")) return 4;
  if (normalized.includes("discovery")) return 3;
  if (normalized.includes("qualified")) return 2;
  return 1;
}

function normalizeProbability(value: unknown) {
  const number = numberValue(value);
  return number <= 1 && number > 0 ? number * 100 : number;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function apiDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

function displayDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOpen(opportunity: Opportunity) {
  return !CLOSED_STAGES.has(opportunity.stageNumber);
}

function weightedValue(opportunity: Opportunity) {
  return (opportunity.value * opportunity.probability) / 100;
}

function normalizeComparableName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesCustomer(opportunity: Opportunity, tenant: TenantOption) {
  if (opportunity.tenantId) return opportunity.tenantId === tenant.id;
  // Leads may not expose tenant_id yet; use exact normalized company name to preserve customer context without loose matching.
  return normalizeComparableName(opportunity.companyName) === normalizeComparableName(tenant.name);
}

function stageClass(stage: number) {
  if (stage === 9) return "bg-green-100 text-green-700";
  if (stage === 10 || stage === 11) return "bg-gray-100 text-gray-700";
  if (stage >= 6) return "bg-teal-100 text-teal-700";
  if (stage >= 4) return "bg-blue-100 text-blue-700";
  if (stage >= 2) return "bg-yellow-100 text-yellow-700";
  return "bg-purple-100 text-purple-700";
}

function nextActionForStage(stage: number) {
  if (stage >= 6 && stage <= 8) return "Close plan";
  if (stage >= 4 && stage <= 5) return "Follow up proposal";
  if (stage >= 2 && stage <= 3) return "Schedule discovery";
  if (stage === 9) return "Handover";
  if (stage === 10) return "Review loss";
  if (stage === 11) return "Re-engage account";
  return "Qualify need";
}

function formFromOpportunity(opportunity: Opportunity): EditForm {
  return {
    contactName: opportunity.contactName,
    contactEmail: opportunity.contactEmail,
    contactPhone: opportunity.contactPhone,
    value: String(opportunity.value),
    probability: String(opportunity.probability),
    expectedCloseDate: opportunity.expectedCloseDate,
    source: opportunity.source,
    notes: opportunity.notes,
  };
}

function priorityClass(value: number) {
  if (value >= 400000) return "bg-red-100 text-red-700";
  if (value >= 250000) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function domId(prefix: string, value: string) {
  return `${prefix}-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function AMOpportunitiesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<OpportunityForm>(emptyOpportunityForm);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [stageOpportunity, setStageOpportunity] = useState<Opportunity | null>(null);
  const [stageForm, setStageForm] = useState<StageForm>(emptyStageForm);
  const [stagePanelHighlight, setStagePanelHighlight] = useState(false);
  const [stagePanelFocusRequest, setStagePanelFocusRequest] = useState(0);
  const stagePanelRef = useRef<HTMLDivElement | null>(null);
  const stagePanelHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";
  const selectedOpportunityId = searchParams.get("opportunity") ?? "";
  const selectedCustomerId = searchParams.get("customer") ?? "";
  const selectedAction = searchParams.get("action") ?? "";

  async function loadData() {
    if (!token) {
      setLoading(false);
      setError("No API token is available. Please sign in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const sessionId = sessionUserId(session);
      const [leadResponse, tenantResponse, profileResponse] = await Promise.all([
        fetchJson<unknown>("/api/v1/leads", token),
        fetchJson<unknown>("/api/v1/tenants", token),
        sessionId ? Promise.resolve<UserProfile | null>(null) : fetchJson<UserProfile>("/api/v1/me", token),
      ]);
      const rawLeads = unwrapList<RawLead>(leadResponse, ["leads", "items"]);
      const rawTenants = unwrapList<RawTenant>(tenantResponse, ["tenants", "items"]);
      const profile = profileResponse ? unwrapData<UserProfile>(profileResponse) : null;
      const normalizedLeads = rawLeads.filter((lead) => Boolean(lead.id)).map(normalizeLead);

      setOpportunities(normalizedLeads);
      setTenants(rawTenants.map(normalizeTenant).filter((tenant): tenant is TenantOption => Boolean(tenant)));
      setOwnerId(sessionId || profile?.id || "");
      if (editing && !normalizedLeads.some((lead) => lead.id === editing.id)) {
        setEditForm(null);
        setEditing(null);
      }
      if (stageOpportunity && !normalizedLeads.some((lead) => lead.id === stageOpportunity.id)) {
        setStageOpportunity(null);
      }
    } catch (loadError) {
      setError(apiErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, token]);

  const selectedCustomer = useMemo(
    () => (selectedCustomerId ? tenants.find((tenant) => tenant.id === selectedCustomerId) : undefined),
    [selectedCustomerId, tenants],
  );
  const selectedCustomerMissing = Boolean(selectedCustomerId && !loading && !selectedCustomer);
  const visibleOpportunities = useMemo(
    () => (selectedCustomer ? opportunities.filter((opportunity) => matchesCustomer(opportunity, selectedCustomer)) : opportunities),
    [opportunities, selectedCustomer],
  );
  const sortedOpportunities = useMemo(() => [...visibleOpportunities].sort((a, b) => b.value - a.value), [visibleOpportunities]);
  const selectedOpportunity = useMemo(
    () => (selectedOpportunityId ? visibleOpportunities.find((opportunity) => opportunity.id === selectedOpportunityId) : undefined),
    [selectedOpportunityId, visibleOpportunities],
  );
  const selectedOpportunityMissing = Boolean(selectedOpportunityId && !loading && !selectedOpportunity);
  const openOpportunities = useMemo(() => visibleOpportunities.filter(isOpen), [visibleOpportunities]);
  const pipelineValue = openOpportunities.reduce((sum, opportunity) => sum + opportunity.value, 0);
  const weightedForecast = openOpportunities.reduce((sum, opportunity) => sum + weightedValue(opportunity), 0);
  const wonValue = visibleOpportunities.filter((opportunity) => opportunity.stageNumber === 9).reduce((sum, opportunity) => sum + opportunity.value, 0);
  const averageProbability =
    openOpportunities.length > 0
      ? openOpportunities.reduce((sum, opportunity) => sum + opportunity.probability, 0) / openOpportunities.length
      : 0;
  const closingThisMonth = openOpportunities.filter((opportunity) => isCurrentMonth(opportunity.expectedCloseDate)).length;
  const selectedTenant = tenants.find((tenant) => tenant.id === createForm.tenantId);
  const stageRows = BOARD_STAGES.map((stage) => {
    const rows = visibleOpportunities.filter((opportunity) => opportunity.stageNumber === stage);
    return {
      count: rows.length,
      stage,
      value: rows.reduce((sum, opportunity) => sum + opportunity.value, 0),
    };
  });
  const closePlanRows = sortedOpportunities.filter((opportunity) => isOpen(opportunity) && (opportunity.value >= 250000 || opportunity.stageNumber >= 5));
  const highestValueDeal = [...openOpportunities].sort((a, b) => b.value - a.value)[0];
  const bestCloseCandidate = [...openOpportunities].sort((a, b) => b.probability - a.probability || b.value - a.value)[0];
  const coachRecommendation =
    highestValueDeal && bestCloseCandidate
      ? `Focus on ${highestValueDeal.companyName} and ${bestCloseCandidate.companyName} to improve this month's forecast.`
      : highestValueDeal
        ? `Focus on ${highestValueDeal.companyName} to improve this month's forecast.`
      : "Create and update live opportunities to build an accurate personal forecast.";

  useEffect(() => {
    if (!selectedOpportunity) return;
    document.getElementById(domId("am-opportunity", selectedOpportunity.id))?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [selectedOpportunity]);

  useEffect(() => {
    if (selectedAction !== "create" || !selectedCustomer) return;
    setShowCreateForm(true);
    setEditing(null);
    setStageOpportunity(null);
    setCreateForm((current) => (current.tenantId === selectedCustomer.id ? current : { ...current, tenantId: selectedCustomer.id }));
  }, [selectedAction, selectedCustomer]);

  useEffect(() => {
    if (!stagePanelFocusRequest) return;

    stagePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setStagePanelHighlight(true);

    if (stagePanelHighlightTimeoutRef.current) {
      clearTimeout(stagePanelHighlightTimeoutRef.current);
    }

    stagePanelHighlightTimeoutRef.current = setTimeout(() => {
      setStagePanelHighlight(false);
      stagePanelHighlightTimeoutRef.current = null;
    }, 1500);
  }, [stagePanelFocusRequest]);

  useEffect(() => {
    return () => {
      if (stagePanelHighlightTimeoutRef.current) {
        clearTimeout(stagePanelHighlightTimeoutRef.current);
      }
    };
  }, []);

  function clearOpportunitySelection() {
    router.push("/am/opportunities");
  }

  function clearCustomerFilter() {
    router.push("/am/opportunities");
  }

  function openStageAction(opportunity: Opportunity, action: StageAction) {
    setStageOpportunity(opportunity);
    setStageForm({ ...emptyStageForm, action: isValidStageAction(opportunity, action) ? action : defaultStageAction(opportunity) });
    setEditing(null);
    setSuccess("");
    setError("");
    setStagePanelFocusRequest((current) => current + 1);
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess("");
    setError("");

    if (!ownerId) {
      setError("Your CRM user profile could not be loaded. Please refresh and try again.");
      return;
    }

    if (!selectedTenant?.countryId || !selectedTenant.sectorId) {
      setError("The selected tenant is missing country or sector data, so it cannot be used for a new opportunity.");
      return;
    }

    setSubmitting(true);

    try {
      await fetchJson<RawLead>("/api/v1/leads", token, {
        method: "POST",
        body: JSON.stringify({
          owner_id: ownerId,
          country_id: selectedTenant.countryId,
          region_id: selectedTenant.regionId || undefined,
          sector_id: selectedTenant.sectorId,
          company_name: selectedTenant.name,
          contact_name: createForm.contactName || undefined,
          contact_email: createForm.contactEmail || undefined,
          contact_phone: createForm.contactPhone || undefined,
          stage: Number(createForm.stage),
          value_usd: Number(createForm.value),
          probability: Number(createForm.probability),
          expected_close_date: apiDate(createForm.expectedCloseDate),
          source: createForm.source || undefined,
          notes: createForm.notes || undefined,
        }),
      });
      setCreateForm(emptyOpportunityForm);
      setShowCreateForm(false);
      setSuccess("Opportunity created successfully.");
      await loadData();
    } catch (submitError) {
      setError(apiErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editForm) return;

    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      await fetchJson<RawLead>(`/api/v1/leads/${editing.id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          contact_name: editForm.contactName || undefined,
          contact_email: editForm.contactEmail || undefined,
          contact_phone: editForm.contactPhone || undefined,
          value_usd: Number(editForm.value),
          probability: Number(editForm.probability),
          expected_close_date: apiDate(editForm.expectedCloseDate),
          source: editForm.source || undefined,
          notes: editForm.notes || undefined,
        }),
      });
      setEditing(null);
      setEditForm(null);
      setSuccess("Opportunity updated successfully.");
      await loadData();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "The selected opportunity no longer exists."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stageOpportunity) return;

    const targetStage = targetStageForAction(stageOpportunity, stageForm.action);
    if (!targetStage) {
      setError("This opportunity cannot be advanced further.");
      return;
    }

    if ((targetStage === 9 || targetStage === 11) && !stageForm.confirmed) {
      setError("Please confirm this stage change before continuing.");
      return;
    }

    if (targetStage === 10 && (!stageForm.reason.trim() || !stageForm.competitor.trim())) {
      setError("Lost opportunities require both a reason and competitor.");
      return;
    }

    setSubmitting(true);
    setSuccess("");
    setError("");

    try {
      const result = await fetchJson<{ lead?: RawLead; warning?: string }>(`/api/v1/leads/${stageOpportunity.id}/stage`, token, {
        method: "PATCH",
        body: JSON.stringify({
          stage: targetStage,
          reason: stageForm.reason || undefined,
          competitor: stageForm.competitor || undefined,
        }),
      });
      setStageOpportunity(null);
      setStageForm(emptyStageForm);
      setSuccess(result.warning ? `Stage updated. ${result.warning}` : "Stage updated successfully.");
      await loadData();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "The selected opportunity no longer exists."));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(opportunity: Opportunity) {
    setEditing(opportunity);
    setEditForm(formFromOpportunity(opportunity));
    setStageOpportunity(null);
    setSuccess("");
    setError("");
  }

  function startStage(opportunity: Opportunity) {
    setStageOpportunity(opportunity);
    setStageForm({ ...emptyStageForm, action: defaultStageAction(opportunity) });
    setEditing(null);
    setSuccess("");
    setError("");
    setStagePanelFocusRequest((current) => current + 1);
  }

  if (status === "loading" || loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (!session) return null;

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">My Opportunities</h1>
            <p className="mt-1 text-sm text-gray-500">Manage live opportunities, forecast, stage changes, and close plans.</p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A9599] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#087d80] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!ownerId || submitting}
            onClick={() => {
              setShowCreateForm((current) => !current);
              if (selectedCustomer) {
                setCreateForm((current) => ({ ...current, tenantId: selectedCustomer.id }));
              }
              setEditing(null);
              setStageOpportunity(null);
              setSuccess("");
              setError("");
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            New Opportunity
          </button>
        </div>
      </div>

      {error && (
        <Alert tone="error">
          <span>{error}</span>
          <button className="font-semibold underline" onClick={() => void loadData()} type="button">
            Retry
          </button>
        </Alert>
      )}

      {success && <Alert tone="success">{success}</Alert>}

      {selectedCustomer && (
        <div className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0A9599]">Customer filter</p>
              <p className="mt-1 text-sm text-gray-700">
                Viewing: <span className="font-semibold text-gray-900">{selectedCustomer.name}</span>
              </p>
            </div>
            <SecondaryButton onClick={clearCustomerFilter} type="button">
              Clear Customer Filter
            </SecondaryButton>
          </div>
        </div>
      )}

      {selectedCustomerMissing && (
        <Alert tone="warning">
          <span>Customer not found.</span>
          <button className="font-semibold underline" onClick={clearCustomerFilter} type="button">
            Clear Selection
          </button>
        </Alert>
      )}

      {selectedOpportunity && (
        <div className="rounded-lg border border-[#0A9599]/30 bg-[#0A9599]/5 p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0A9599]">Selected opportunity</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">{selectedOpportunity.companyName}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatUSD(selectedOpportunity.value)} · {selectedOpportunity.stageName} · {selectedOpportunity.probability.toFixed(1)}% probability
              </p>
              <p className="mt-2 text-sm text-gray-700">
                {selectedAction === "follow-up" ? "Follow up on this opportunity." : nextActionForStage(selectedOpportunity.stageNumber)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SmallButton onClick={() => startEdit(selectedOpportunity)} type="button">
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </SmallButton>
              {nextStage(selectedOpportunity) && (
                <SmallButton onClick={() => openStageAction(selectedOpportunity, "next")} type="button">
                  Advance Stage
                </SmallButton>
              )}
              {selectedOpportunity.stageNumber === 8 && (
                <SmallButton onClick={() => openStageAction(selectedOpportunity, "won")} type="button">
                  Mark Won
                </SmallButton>
              )}
              {isOpen(selectedOpportunity) && (
                <SmallButton onClick={() => openStageAction(selectedOpportunity, "lost")} type="button">
                  Mark Lost
                </SmallButton>
              )}
              <SecondaryButton onClick={clearOpportunitySelection} type="button">
                Clear selection
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}

      {selectedOpportunityMissing && (
        <Alert tone="warning">
          <span>The selected opportunity could not be found in your current opportunity list.</span>
          <button className="font-semibold underline" onClick={clearOpportunitySelection} type="button">
            Clear selection
          </button>
        </Alert>
      )}

      {showCreateForm && (
        <FormSection title="Create Opportunity">
          {!tenants.length && <p className="mb-4 text-sm text-red-600">No assigned tenants are available for opportunity creation.</p>}
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={submitCreate}>
            <Label text="Tenant">
              <select
                className={inputClassName}
                onChange={(event) => setCreateForm((current) => ({ ...current, tenantId: event.target.value }))}
                required
                value={createForm.tenantId}
              >
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} - {tenant.country} - {tenant.sector}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Stage">
              <select className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, stage: event.target.value }))} value={createForm.stage}>
                {CREATE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}. {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Value USD">
              <input
                className={inputClassName}
                min="0"
                onChange={(event) => setCreateForm((current) => ({ ...current, value: event.target.value }))}
                required
                type="number"
                value={createForm.value}
              />
            </Label>
            <Label text="Probability %">
              <input
                className={inputClassName}
                max="100"
                min="0"
                onChange={(event) => setCreateForm((current) => ({ ...current, probability: event.target.value }))}
                required
                type="number"
                value={createForm.probability}
              />
            </Label>
            <Label text="Expected Close Date">
              <input
                className={inputClassName}
                onChange={(event) => setCreateForm((current) => ({ ...current, expectedCloseDate: event.target.value }))}
                required
                type="date"
                value={createForm.expectedCloseDate}
              />
            </Label>
            <Label text="Source">
              <input className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, source: event.target.value }))} value={createForm.source} />
            </Label>
            <Label text="Contact Name">
              <input className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, contactName: event.target.value }))} value={createForm.contactName} />
            </Label>
            <Label text="Contact Email">
              <input className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, contactEmail: event.target.value }))} type="email" value={createForm.contactEmail} />
            </Label>
            <Label text="Contact Phone">
              <input className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, contactPhone: event.target.value }))} value={createForm.contactPhone} />
            </Label>
            <Label className="lg:col-span-3" text="Notes">
              <textarea className={inputClassName} onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))} rows={3} value={createForm.notes} />
            </Label>
            <div className="flex gap-3 lg:col-span-3">
              <PrimaryButton disabled={submitting || !tenants.length} type="submit">
                Create Opportunity
              </PrimaryButton>
              <SecondaryButton onClick={() => setShowCreateForm(false)} type="button">
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </FormSection>
      )}

      {editing && editForm && (
        <FormSection title={`Edit ${editing.companyName}`}>
          <form className="grid gap-4 lg:grid-cols-3" onSubmit={submitEdit}>
            <Label text="Value USD">
              <input className={inputClassName} min="0" onChange={(event) => setEditForm({ ...editForm, value: event.target.value })} required type="number" value={editForm.value} />
            </Label>
            <Label text="Probability %">
              <input className={inputClassName} max="100" min="0" onChange={(event) => setEditForm({ ...editForm, probability: event.target.value })} required type="number" value={editForm.probability} />
            </Label>
            <Label text="Expected Close Date">
              <input className={inputClassName} onChange={(event) => setEditForm({ ...editForm, expectedCloseDate: event.target.value })} required type="date" value={editForm.expectedCloseDate} />
            </Label>
            <Label text="Source">
              <input className={inputClassName} onChange={(event) => setEditForm({ ...editForm, source: event.target.value })} value={editForm.source} />
            </Label>
            <Label text="Contact Name">
              <input className={inputClassName} onChange={(event) => setEditForm({ ...editForm, contactName: event.target.value })} value={editForm.contactName} />
            </Label>
            <Label text="Contact Email">
              <input className={inputClassName} onChange={(event) => setEditForm({ ...editForm, contactEmail: event.target.value })} type="email" value={editForm.contactEmail} />
            </Label>
            <Label text="Contact Phone">
              <input className={inputClassName} onChange={(event) => setEditForm({ ...editForm, contactPhone: event.target.value })} value={editForm.contactPhone} />
            </Label>
            <Label className="lg:col-span-3" text="Notes">
              <textarea className={inputClassName} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} rows={3} value={editForm.notes} />
            </Label>
            <div className="flex gap-3 lg:col-span-3">
              <PrimaryButton disabled={submitting} type="submit">
                Save Changes
              </PrimaryButton>
              <SecondaryButton onClick={() => setEditing(null)} type="button">
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </FormSection>
      )}

      {stageOpportunity && (
        <div
          className={`scroll-mt-24 rounded-lg transition-shadow duration-300 ${stagePanelHighlight ? "ring-2 ring-teal-500 ring-offset-2" : ""}`}
          ref={stagePanelRef}
        >
          <FormSection title={`Change Stage - ${stageOpportunity.companyName}`}>
            <form className="grid gap-4 lg:grid-cols-3" onSubmit={submitStage}>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 lg:col-span-3">
                <p className="text-sm text-gray-500">Current stage</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {stageOpportunity.stageNumber}. {stageOpportunity.stageName}
                </p>
              </div>
              {isOpen(stageOpportunity) ? (
                <Label text="Stage action">
                  <select className={inputClassName} onChange={(event) => setStageForm({ ...stageForm, action: event.target.value as StageAction, confirmed: false })} value={stageForm.action}>
                    {nextStage(stageOpportunity) && (
                      <option value="next">
                        Advance to {STAGE_LABELS[nextStage(stageOpportunity) as number]}
                      </option>
                    )}
                    {stageOpportunity.stageNumber === 8 && <option value="won">Mark Won</option>}
                    <option value="lost">Mark Lost</option>
                    <option value="dormant">Mark Dormant</option>
                  </select>
                </Label>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 lg:col-span-3">This deal is closed.</div>
              )}
              {isOpen(stageOpportunity) && stageForm.action === "lost" && (
                <>
                  <Label text="Loss reason">
                    <input className={inputClassName} onChange={(event) => setStageForm({ ...stageForm, reason: event.target.value })} required value={stageForm.reason} />
                  </Label>
                  <Label text="Competitor">
                    <input className={inputClassName} onChange={(event) => setStageForm({ ...stageForm, competitor: event.target.value })} required value={stageForm.competitor} />
                  </Label>
                </>
              )}
              {isOpen(stageOpportunity) && (stageForm.action === "won" || stageForm.action === "dormant" || targetStageForAction(stageOpportunity, stageForm.action) === 9) && (
                <label className="flex items-center gap-2 text-sm text-gray-700 lg:col-span-3">
                  <input
                    checked={stageForm.confirmed}
                    className="h-4 w-4 rounded border-gray-300 text-[#0A9599] focus:ring-[#0A9599]"
                    onChange={(event) => setStageForm({ ...stageForm, confirmed: event.target.checked })}
                    type="checkbox"
                  />
                  Confirm this stage change.
                </label>
              )}
              <div className="flex gap-3 lg:col-span-3">
                {isOpen(stageOpportunity) && (
                  <PrimaryButton disabled={submitting} type="submit">
                    Update Stage
                  </PrimaryButton>
                )}
                <SecondaryButton onClick={() => setStageOpportunity(null)} type="button">
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          </FormSection>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={CircleDollarSign} label="My Pipeline" value={formatUSD(pipelineValue)} />
        <KpiCard icon={Target} label="Open Opportunities" value={openOpportunities.length.toString()} />
        <KpiCard icon={TrendingUp} label="Weighted Forecast" value={formatUSD(weightedForecast)} />
        <KpiCard icon={CheckCircle2} label="Won Value" value={formatUSD(wonValue)} />
        <KpiCard icon={CalendarClock} label="Closing This Month" value={closingThisMonth.toString()} />
        <KpiCard icon={TrendingUp} label="Avg Probability" value={`${averageProbability.toFixed(1)}%`} />
      </div>

      <Section title="Pipeline by Stage">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {stageRows.map((stage) => (
            <div className="rounded-lg border border-gray-200 bg-white p-4" key={stage.stage}>
              <Badge className={stageClass(stage.stage)}>{STAGE_LABELS[stage.stage]}</Badge>
              <p className="mt-4 text-2xl font-semibold text-gray-900">{stage.count}</p>
              <p className="mt-1 text-sm text-gray-500">{formatUSD(stage.value)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Opportunity Table">
        <Table minWidth="1120px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Tenant / Company</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 pr-4 text-right font-medium">Weighted Value</th>
              <th className="py-3 pr-4 font-medium">Expected Close Date</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOpportunities.map((opportunity) => {
              const isSelected = selectedOpportunity?.id === opportunity.id;
              const isCustomerMatch = Boolean(selectedCustomer && matchesCustomer(opportunity, selectedCustomer));

              return (
              <tr
                className={`scroll-mt-24 border-b transition last:border-0 ${isSelected || isCustomerMatch ? "bg-teal-50 ring-1 ring-inset ring-teal-500" : ""}`}
                id={domId("am-opportunity", opportunity.id)}
                key={opportunity.id}
              >
                <td className="py-3 pr-4 font-medium text-gray-900">{opportunity.companyName}</td>
                <td className="py-3 pr-4 text-gray-500">{opportunity.companyName}</td>
                <td className="py-3 pr-4">
                  <Badge className={stageClass(opportunity.stageNumber)}>{opportunity.stageName}</Badge>
                </td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                <td className="py-3 pr-4 text-right">{opportunity.probability.toFixed(1)}%</td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(weightedValue(opportunity))}</td>
                <td className="py-3 pr-4 text-gray-500">{displayDate(opportunity.expectedCloseDate)}</td>
                <td className="py-3 pr-4 text-gray-500">{opportunity.status}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <SmallButton onClick={() => startEdit(opportunity)} type="button">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </SmallButton>
                    <SmallButton disabled={!isOpen(opportunity)} onClick={() => startStage(opportunity)} type="button">
                      Stage
                    </SmallButton>
                  </div>
                </td>
              </tr>
            );
            })}
            {!sortedOpportunities.length && (
              <tr>
                <td className="py-8 text-sm text-gray-500" colSpan={9}>
                  {selectedCustomer ? "No live opportunities found for this customer yet." : "No live opportunities found for your account yet."}
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      <Section title="Opportunity Board">
        <div className="grid gap-4 xl:grid-cols-6">
          {BOARD_STAGES.map((stage) => {
            const rows = sortedOpportunities.filter((opportunity) => opportunity.stageNumber === stage);
            return (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3" key={stage}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge className={stageClass(stage)}>{STAGE_LABELS[stage]}</Badge>
                  <span className="text-xs font-semibold text-gray-500">{rows.length}</span>
                </div>
                <div className="space-y-3">
                  {rows.map((opportunity) => {
                    const isSelected = selectedOpportunity?.id === opportunity.id;
                    const isCustomerMatch = Boolean(selectedCustomer && matchesCustomer(opportunity, selectedCustomer));

                    return (
                    <div
                      className={`rounded-lg border bg-white p-3 transition ${isSelected || isCustomerMatch ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500" : "border-gray-200"}`}
                      key={opportunity.id}
                    >
                      <p className="text-sm font-semibold text-gray-900">{opportunity.companyName}</p>
                      <div className="mt-3 space-y-1 text-xs text-gray-600">
                        <p>{formatUSD(opportunity.value)}</p>
                        <p>{opportunity.probability.toFixed(1)}% probability</p>
                        <p>{displayDate(opportunity.expectedCloseDate)}</p>
                        <p className="font-medium text-[#0A9599]">{nextActionForStage(opportunity.stageNumber)}</p>
                      </div>
                      <div className="mt-3">
                        <SmallButton disabled={!isOpen(opportunity)} onClick={() => startStage(opportunity)} type="button">
                          Stage
                        </SmallButton>
                      </div>
                    </div>
                  );
                  })}
                  {!rows.length && <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400">No deals</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Close Plan Priorities">
        <Table minWidth="880px">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="py-3 pr-4 font-medium">Opportunity</th>
              <th className="py-3 pr-4 font-medium">Stage</th>
              <th className="py-3 pr-4 text-right font-medium">Value</th>
              <th className="py-3 pr-4 text-right font-medium">Probability</th>
              <th className="py-3 pr-4 text-right font-medium">Priority</th>
              <th className="py-3 font-medium">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {closePlanRows.map((opportunity) => (
              <tr className="border-b last:border-0" key={opportunity.id}>
                <td className="py-3 pr-4 font-medium text-gray-900">{opportunity.companyName}</td>
                <td className="py-3 pr-4">
                  <Badge className={stageClass(opportunity.stageNumber)}>{opportunity.stageName}</Badge>
                </td>
                <td className="py-3 pr-4 text-right font-semibold">{formatUSD(opportunity.value)}</td>
                <td className="py-3 pr-4 text-right">{opportunity.probability.toFixed(1)}%</td>
                <td className="py-3 pr-4 text-right">
                  <Badge className={priorityClass(opportunity.value)}>{opportunity.value >= 400000 ? "High" : opportunity.value >= 250000 ? "Medium" : "Low"}</Badge>
                </td>
                <td className="py-3">{nextActionForStage(opportunity.stageNumber)}</td>
              </tr>
            ))}
            {!closePlanRows.length && (
              <tr>
                <td className="py-8 text-sm text-gray-500" colSpan={6}>
                  No close-plan priorities yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      <Card className="border-[#0A9599]/40 bg-[#0A9599]/5 rounded-lg shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-[#0A9599]">Sales Coach</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-5">
            <CoachMetric label="Highest value deal" value={highestValueDeal ? highestValueDeal.companyName : "No open deal"} />
            <CoachMetric label="Best close candidate" value={bestCloseCandidate ? bestCloseCandidate.companyName : "No candidate"} />
            <CoachMetric label="Forecast value" value={formatUSD(weightedForecast)} />
            <CoachMetric label="Deals needing action" value={closePlanRows.length.toString()} />
            <div className="rounded-lg border border-[#0A9599]/30 bg-white p-4 text-sm lg:col-span-5">{coachRecommendation}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AMOpportunitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading...</div>}>
      <AMOpportunitiesContent />
    </Suspense>
  );
}

function isCurrentMonth(value: string) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function nextStage(opportunity: Opportunity) {
  if (opportunity.stageNumber >= 8) return null;
  return opportunity.stageNumber + 1;
}

function defaultStageAction(opportunity: Opportunity): StageAction {
  if (nextStage(opportunity)) return "next";
  if (opportunity.stageNumber === 8) return "won";
  return "lost";
}

function isValidStageAction(opportunity: Opportunity, action: StageAction) {
  if (!isOpen(opportunity)) return false;
  if (action === "next") return Boolean(nextStage(opportunity));
  if (action === "won") return opportunity.stageNumber === 8;
  return action === "lost" || action === "dormant";
}

function targetStageForAction(opportunity: Opportunity, action: StageAction) {
  if (!isValidStageAction(opportunity, action)) return null;
  if (action === "won") return 9;
  if (action === "lost") return 10;
  if (action === "dormant") return 11;
  return nextStage(opportunity);
}

const inputClassName =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400";

function Alert({ children, tone }: { children: ReactNode; tone: "error" | "success" | "warning" }) {
  const isError = tone === "error";
  const isWarning = tone === "warning";
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border p-4 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : isWarning
            ? "border-yellow-200 bg-yellow-50 text-yellow-700"
            : "border-green-200 bg-green-50 text-green-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {isError || isWarning ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
        <div>{children}</div>
      </div>
    </div>
  );
}

function Label({ children, className = "", text }: { children: ReactNode; className?: string; text: string }) {
  return (
    <label className={`block text-sm font-medium text-gray-700 ${className}`}>
      {text}
      {children}
    </label>
  );
}

function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Table({ children, minWidth }: { children: ReactNode; minWidth: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

function PrimaryButton({ children, disabled, type }: { children: ReactNode; disabled?: boolean; type: "button" | "submit" }) {
  return (
    <button
      className="rounded-lg bg-[#0A9599] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#087d80] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, onClick, type }: { children: ReactNode; onClick: () => void; type: "button" }) {
  return (
    <button
      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2"
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function SmallButton({ children, disabled, onClick, type }: { children: ReactNode; disabled?: boolean; onClick: () => void; type: "button" }) {
  return (
    <button
      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#0A9599] hover:text-[#0A9599] focus:outline-none focus:ring-2 focus:ring-[#0A9599] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#0A9599]/20 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800">{value}</p>
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
        <p className="text-xl font-semibold tracking-tight text-gray-900 xl:text-2xl">{value}</p>
      </CardContent>
    </Card>
  );
}
