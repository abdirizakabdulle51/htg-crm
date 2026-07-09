"use client";

import type { ComponentType } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  FileUp,
  GitBranch,
  Layers3,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type RuleStatus = "Active" | "Inactive";
type ApprovalLevel = "GM" | "HoB" | "CEO";
type WorkflowType = "Commercial" | "Renewal" | "Discount" | "Exception";
type WorkflowHealth = "Healthy" | "Warning" | "Incomplete";

type ApprovalRule = {
  rule: string;
  threshold: number;
  approver: string;
  level: ApprovalLevel;
  workflow: WorkflowType;
  escalation: string;
  status: RuleStatus;
};

type EscalationRule = {
  rule: string;
  escalation: string;
  status: WorkflowHealth;
};

const approvalRules: ApprovalRule[] = [
  {
    rule: "Strategic Discount",
    threshold: 100000,
    approver: "Head of Business",
    level: "HoB",
    workflow: "Discount",
    escalation: "CEO review after 48 hours",
    status: "Active",
  },
  {
    rule: "Strategic Renewal",
    threshold: 250000,
    approver: "Head of Business",
    level: "HoB",
    workflow: "Renewal",
    escalation: "CEO review after 72 hours",
    status: "Active",
  },
  {
    rule: "Country Discount",
    threshold: 25000,
    approver: "Country GM",
    level: "GM",
    workflow: "Discount",
    escalation: "HoB review after 24 hours",
    status: "Active",
  },
  {
    rule: "Large Opportunity",
    threshold: 500000,
    approver: "CEO",
    level: "CEO",
    workflow: "Commercial",
    escalation: "Board visibility after 5 days",
    status: "Active",
  },
  {
    rule: "Commercial Exception",
    threshold: 50000,
    approver: "Head of Business",
    level: "HoB",
    workflow: "Exception",
    escalation: "CEO review after 48 hours",
    status: "Active",
  },
];

const hierarchy = [
  { level: "Account Manager", threshold: "Submit request", purpose: "Create proposal, discount, renewal, or exception request" },
  { level: "Country GM", threshold: "$25,000+", purpose: "Country-level discount and commercial readiness review" },
  { level: "Head of Business", threshold: "$50,000+", purpose: "Strategic renewal, discount, and exception governance" },
  { level: "CEO", threshold: "$500,000+", purpose: "Large opportunity and executive commercial governance" },
];

const escalationRules: EscalationRule[] = [
  { rule: "Discount exceeds threshold", escalation: "Escalate from Country GM to Head of Business", status: "Healthy" },
  { rule: "Renewal exceeds threshold", escalation: "Escalate from HoB to CEO if unresolved", status: "Incomplete" },
  { rule: "Commercial exception", escalation: "Escalate to HoB with policy note", status: "Warning" },
  { rule: "Large opportunity", escalation: "Escalate directly to CEO", status: "Healthy" },
  { rule: "System override", escalation: "Require Admin audit review", status: "Warning" },
];

const warnings = [
  "No renewal workflow configured",
  "CEO approval threshold exceeds company policy",
  "Discount workflow missing escalation",
];

const workflowPlaceholders = [
  "Workflow Builder",
  "Approval Designer",
  "Drag-and-drop Workflow",
  "Rule Simulator",
  "Approval Testing",
  "Workflow Audit",
];

const statusOptions = ["All", "Active", "Inactive"];
const levelOptions = ["All", "GM", "HoB", "CEO"];
const workflowOptions = ["All", "Commercial", "Renewal", "Discount", "Exception"];

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

function statusClass(status: RuleStatus | WorkflowHealth) {
  if (status === "Active" || status === "Healthy") return "bg-emerald-100 text-emerald-700";
  if (status === "Warning") return "bg-amber-100 text-amber-700";
  if (status === "Incomplete") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function KpiCard({
  icon: Icon,
  label,
  subtext,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  subtext?: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-[#0A9599]" />
      </div>
      <p className="mt-5 text-2xl font-bold text-gray-900">{value}</p>
      {subtext ? <p className="mt-2 text-sm text-gray-500">{subtext}</p> : null}
    </div>
  );
}

function Badge({ className, label }: { className: string; label: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function DisabledButton({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400"
      disabled
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <select
      aria-label={label}
      className="h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {label}: {option}
        </option>
      ))}
    </select>
  );
}

function CoachMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-100 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function AdminApprovalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");
  const [workflowFilter, setWorkflowFilter] = useState("All");

  const activeRules = approvalRules.filter((rule) => rule.status === "Active").length;
  const approvalLevels = new Set(approvalRules.map((rule) => rule.level)).size;
  const workflowTemplates = new Set(approvalRules.map((rule) => rule.workflow)).size;
  const incompleteEscalations = escalationRules.filter((rule) => rule.status !== "Healthy").length;
  const workflowHealth: WorkflowHealth = incompleteEscalations > 1 ? "Warning" : incompleteEscalations === 1 ? "Incomplete" : "Healthy";

  const filteredRules = useMemo(() => {
    const query = search.trim().toLowerCase();

    return approvalRules.filter((rule) => {
      const matchesSearch =
        !query ||
        rule.rule.toLowerCase().includes(query) ||
        rule.approver.toLowerCase().includes(query) ||
        rule.workflow.toLowerCase().includes(query) ||
        rule.escalation.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || rule.status === statusFilter;
      const matchesLevel = levelFilter === "All" || rule.level === levelFilter;
      const matchesWorkflow = workflowFilter === "All" || rule.workflow === workflowFilter;

      return matchesSearch && matchesStatus && matchesLevel && matchesWorkflow;
    });
  }, [levelFilter, search, statusFilter, workflowFilter]);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-800">Approvals Configuration</h1>
        <p className="mt-2 text-sm text-gray-500">
          Configure approval rules, thresholds, commercial workflows, and governance.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ShieldCheck} label="Approval Rules" value={approvalRules.length.toString()} />
        <KpiCard icon={CheckCircle2} label="Active Rules" value={activeRules.toString()} />
        <KpiCard icon={Layers3} label="Approval Levels" value={approvalLevels.toString()} />
        <KpiCard icon={GitBranch} label="Workflow Templates" value={workflowTemplates.toString()} />
        <KpiCard icon={Settings2} label="Pending Configuration" value={incompleteEscalations.toString()} />
        <KpiCard icon={AlertTriangle} label="Escalation Rules" value={escalationRules.length.toString()} />
        <KpiCard icon={CheckCircle2} label="Workflow Health" subtext={workflowHealth} value={workflowHealth} />
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Configuration Actions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Approval configuration actions will be enabled after backend workflow integration.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DisabledButton icon={Plus} label="Add Rule" />
            <DisabledButton icon={Pencil} label="Edit Rule" />
            <DisabledButton icon={Copy} label="Clone Workflow" />
            <DisabledButton icon={FileUp} label="Import Rules" />
            <DisabledButton icon={FileDown} label="Export Rules" />
          </div>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Search and Filters</h2>
        <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              className="h-11 w-full rounded-md border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-700 outline-none focus:border-[#0A9599] focus:ring-2 focus:ring-[#0A9599]/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rule, approver, or workflow"
              value={search}
            />
          </label>
          <FilterSelect label="Status" onChange={setStatusFilter} options={statusOptions} value={statusFilter} />
          <FilterSelect label="Approval Level" onChange={setLevelFilter} options={levelOptions} value={levelFilter} />
          <FilterSelect label="Workflow" onChange={setWorkflowFilter} options={workflowOptions} value={workflowFilter} />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Approval Rules</h2>
        <p className="mt-1 text-sm text-gray-500">Read-only workflow rules prepared for future approval engine integration.</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-3">Rule</th>
                <th className="py-3">Threshold</th>
                <th className="py-3">Approver</th>
                <th className="py-3">Workflow</th>
                <th className="py-3">Escalation</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr className="border-b border-gray-100 last:border-0" key={rule.rule}>
                  <td className="py-4 font-semibold text-gray-900">{rule.rule}</td>
                  <td className="py-4 text-gray-700">{currency.format(rule.threshold)}</td>
                  <td className="py-4 text-gray-700">{rule.approver}</td>
                  <td className="py-4 text-gray-700">{rule.workflow}</td>
                  <td className="py-4 text-gray-700">{rule.escalation}</td>
                  <td className="py-4">
                    <Badge className={statusClass(rule.status)} label={rule.status} />
                  </td>
                  <td className="py-4">
                    <div className="flex justify-end gap-2">
                      <button className="rounded-md border border-gray-200 p-2 text-gray-400" disabled title="View" type="button">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="rounded-md border border-gray-200 p-2 text-gray-400" disabled title="Edit" type="button">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="rounded-md border border-gray-200 p-2 text-gray-400" disabled title="Clone" type="button">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="rounded-md border border-gray-200 p-2 text-gray-400" disabled title="Delete" type="button">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 ? (
                <tr>
                  <td className="py-6 text-sm text-gray-500" colSpan={7}>
                    No approval rules match the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Workflow Hierarchy</h2>
        <p className="mt-1 text-sm text-gray-500">Approval path from account execution to executive governance.</p>
        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-4">
          {hierarchy.map((step, index) => (
            <div className="rounded-lg border border-gray-200 p-5" key={step.level}>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#0A9599]/10 px-3 py-1 text-xs font-semibold text-[#0A9599]">
                  Level {index + 1}
                </span>
                {index < hierarchy.length - 1 ? <span className="text-sm font-semibold text-gray-400">Next</span> : null}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.level}</h3>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Threshold</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{step.threshold}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Purpose</p>
              <p className="mt-1 text-sm text-gray-600">{step.purpose}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Escalation Rules</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {escalationRules.map((rule) => (
            <div className="rounded-lg border border-gray-200 p-5" key={rule.rule}>
              <p className="text-sm font-semibold text-gray-900">{rule.rule}</p>
              <p className="mt-2 text-sm text-gray-500">{rule.escalation}</p>
              <div className="mt-4">
                <Badge className={statusClass(rule.status)} label={rule.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Configuration Warnings</h2>
        <div className="mt-5 space-y-3">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-yellow-700" key={warning}>
                {warning}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
              All approval workflows are configured.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-6">
        <h2 className="text-xl font-semibold text-[#0A9599]">Approval Admin Coach</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CoachMetric label="Configured Rules" value={approvalRules.length.toString()} />
          <CoachMetric label="Workflow Health" value={workflowHealth} />
          <CoachMetric label="Most Urgent Issue" value={warnings[0] ?? "No urgent issue"} />
          <CoachMetric label="Recommendation" value="Complete renewal workflow configuration before enabling commercial approvals." />
        </div>
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Version 2 Placeholders</h2>
        <p className="mt-1 text-sm text-gray-500">
          Approval workflow editing will be enabled after backend write APIs are connected.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflowPlaceholders.map((workflow) => (
            <button
              className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-left text-sm text-gray-400"
              disabled
              key={workflow}
              type="button"
            >
              <span className="font-semibold text-gray-500">{workflow}</span>
              <span className="mt-2 block">Coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
