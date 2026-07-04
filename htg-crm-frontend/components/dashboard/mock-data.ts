import type {
  AIRecommendation,
  CrossSellOpportunity,
  Lead,
  Renewal,
  RevenuePoint,
  Task,
  TeamPerformance,
  Tenant,
  TenantAlert,
} from "@/types/crm";

export const leads: Lead[] = [
  {
    id: "lead-1",
    companyName: "Hormuud Digital",
    contactName: "Abdi Warsame",
    ownerId: "user-1",
    stage: "qualified",
    valueUsd: 82000,
    probability: 0.68,
    expectedCloseDate: "2026-08-15",
    country: "Somalia",
    sector: "Telecom",
  },
  {
    id: "lead-2",
    companyName: "Nairobi Finance Hub",
    contactName: "James Kamau",
    ownerId: "user-1",
    stage: "proposal",
    valueUsd: 124000,
    probability: 0.52,
    expectedCloseDate: "2026-09-02",
    country: "Kenya",
    sector: "Financial Services",
  },
];

export const tenants: Tenant[] = [
  {
    id: "tenant-1",
    name: "Addis Health Systems",
    country: "Ethiopia",
    sector: "Healthcare",
    health: "healthy",
    arrUsd: 96000,
    renewalDate: "2026-10-01",
    services: [
      { id: "svc-1", name: "Managed Cloud", status: "active", monthlyUsd: 5200 },
      { id: "svc-2", name: "Security Monitoring", status: "active", monthlyUsd: 2800 },
    ],
  },
];

export const alerts: TenantAlert[] = [
  { id: "alert-1", tenantName: "Somalia Tenant 04", severity: "high", message: "Usage dropped 34% this month" },
  { id: "alert-2", tenantName: "Ethiopia Tenant 04", severity: "medium", message: "Renewal has no next meeting" },
];

export const opportunities: CrossSellOpportunity[] = [
  { id: "opp-1", tenantName: "Kenya Tenant 01", serviceName: "Backup Vault", valueUsd: 18000, confidence: 0.74 },
  { id: "opp-2", tenantName: "Ethiopia Tenant 03", serviceName: "Edge Security", valueUsd: 32000, confidence: 0.61 },
];

export const renewals: Renewal[] = [
  { id: "renewal-1", tenantName: "Djibouti Tenant 01", renewalDate: "2026-11-30", valueUsd: 240000, ownerName: "Ahmed Hassan" },
  { id: "renewal-2", tenantName: "Kenya Tenant 04", renewalDate: "2026-09-30", valueUsd: 150000, ownerName: "Mary Njoroge" },
];

export const tasks: Task[] = [
  { id: "task-1", title: "Send proposal revision", dueDate: "2026-07-10", ownerName: "Ahmed Hassan", tenantName: "Hormuud Digital" },
  { id: "task-2", title: "Book renewal review", dueDate: "2026-07-12", ownerName: "Mary Njoroge", tenantName: "Kenya Tenant 04" },
];

export const teamPerformance: TeamPerformance[] = [
  { id: "perf-1", name: "Ahmed Hassan", role: "ACCOUNT_MANAGER", revenueUsd: 420000, pipelineUsd: 860000, targetAttainment: 0.84 },
  { id: "perf-2", name: "Mary Njoroge", role: "COUNTRY_MANAGER", revenueUsd: 1180000, pipelineUsd: 2100000, targetAttainment: 0.91 },
];

// Numbers reflect seeded tenant ARR totals per country
export const revenueByCountry: RevenuePoint[] = [
  { name: "Somalia", revenue: 1236000, target: 1500000 },
  { name: "Kenya", revenue: 2100000, target: 2400000 },
  { name: "Ethiopia", revenue: 1776000, target: 2000000 },
  { name: "Djibouti", revenue: 852000, target: 1000000 },
];

export const revenueBySector: RevenuePoint[] = [
  { name: "Telecom", revenue: 1120000 },
  { name: "Finance", revenue: 1320000 },
  { name: "Healthcare", revenue: 620000 },
  { name: "Retail", revenue: 460000 },
];

export const recommendations: AIRecommendation[] = [
  {
    id: "ai-1",
    title: "Renewal at risk",
    message: "Schedule an executive check-in for Somalia Tenant 04 before end of month.",
    priority: "high",
  },
];
