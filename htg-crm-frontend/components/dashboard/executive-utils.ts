import type { TeamTarget, Tenant } from "@/types/crm";

export function currentQuarter() {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

export function tenantMonthlyRevenue(tenant: Tenant) {
  return tenant.monthly_revenue_usd ?? tenant.mrr_usd ?? (tenant.arr_usd ?? tenant.arrUsd ?? 0) / 12;
}

export function tenantARR(tenant: Tenant) {
  return tenant.arr_usd ?? tenant.arrUsd ?? tenantMonthlyRevenue(tenant) * 12;
}

export function quarterlyTarget(member: TeamTarget) {
  return member.quarterly_target_usd ?? member.annual_target_usd / 4;
}

export function achievementPercent(achieved: number, target: number) {
  if (target <= 0) return 0;
  return (achieved / target) * 100;
}

export function healthFromAchievement(percent: number): "RED" | "YELLOW" | "GREEN" {
  if (percent >= 95) return "GREEN";
  if (percent >= 80) return "YELLOW";
  return "RED";
}
