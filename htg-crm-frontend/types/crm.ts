export interface TargetHealth {
  user_id: string;
  year: number;
  quarter: number;
  quarterly_target_usd: number;
  achieved_usd: number;
  expected_cumulative_usd: number;
  gap_usd: number;
  gap_percent: number;
  health: "RED" | "YELLOW" | "GREEN";
  working_days_total: number;
  working_days_elapsed: number;
  working_days_remaining: number;
  required_daily_pace_usd: number;
  ai_advice: string;
}

export interface QuarterTarget {
  id: string;
  sales_target_id: string;
  quarter: number;
  quarterly_target_usd: number;
  achieved_usd: number;
  is_manually_set: boolean;
}

export interface AnnualTarget {
  id: string;
  user_id: string;
  year: number;
  annual_target_usd: number;
  quarters?: QuarterTarget[];
}

export interface AICoachResponse {
  greeting: string;
  health_summary: string;
  top_3_actions: string[];
  cross_sell_alerts: string[];
  renewal_warnings: string[];
  daily_target_message: string;
  sales_tip: string;
}

export interface PipelineStageBreakdown {
  stage: number;
  name: string;
  count: number;
  value: number;
  avg_probability: number;
}

export interface PipelineSectorBreakdown {
  sector_id: string;
  sector: string;
  count: number;
  value: number;
  tenant_revenue_usd?: number;
}

export interface PipelineOwnerBreakdown {
  user_id: string;
  name: string;
  count: number;
  value: number;
  health: "RED" | "YELLOW" | "GREEN";
}

export interface PipelineCountryBreakdown {
  country_id: string;
  country: string;
  count: number;
  value: number;
}

export interface PipelineOverview {
  total_value_usd: number;
  total_count: number;
  by_stage: PipelineStageBreakdown[];
  by_sector?: PipelineSectorBreakdown[];
  by_country?: PipelineCountryBreakdown[];
  by_owner?: PipelineOwnerBreakdown[];
  won_this_month?: {
    count: number;
    value: number;
  };
  lost_this_month?: {
    count: number;
    value: number;
  };
  conversion_rate?: number;
  avg_deal_cycle_days?: number;
}

export interface Tenant {
  id: string;
  country_id?: string;
  sector_id?: string;
  account_manager_id?: string;
  account_manager_name?: string;
  name: string;
  country?: string;
  sector?: string;
  sector_name?: string;
  status?: string;
  risk_score?: number;
  arr_usd?: number;
  mrr_usd?: number;
  monthly_revenue_usd?: number;
  renewal_date?: string;
  health?: string;
  arrUsd?: number;
  renewalDate?: string;
  services?: Array<{
    id: string;
    name: string;
    status: string;
    monthlyUsd: number;
  }>;
}

export interface Service {
  id: string;
  name: string;
  status: string;
  monthlyUsd?: number;
}

export interface AIRecommendation {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  title: string;
  message: string;
  priority: string;
  recommended_service?: string;
  estimated_monthly_value_usd?: number;
}

export interface Contract {
  id: string;
  tenant_id: string;
  contract_number: string;
  status: string;
  end_date: string;
  value_usd: number;
  days_to_expiry?: number;
}

export interface OverdueActivity {
  id: string;
  type: string;
  subject: string;
  entity_name: string;
  entity_type: "tenant" | "lead" | "activity";
  entity_id: string;
  next_action_date: string;
  days_overdue: number;
}

export interface TargetsResponse {
  targets: AnnualTarget[];
}

export interface TeamTarget {
  user_id: string;
  email: string;
  name: string;
  country_office_id: string;
  annual_target_usd: number;
  achieved_usd: number;
  quarterly_target_usd?: number;
  gap_usd?: number;
  health?: "RED" | "YELLOW" | "GREEN";
  pipeline_value_usd?: number;
  last_activity_at?: string;
}

export interface TeamTargetsResponse {
  team: TeamTarget[];
}

export interface ForecastResponse {
  period: string;
  scope: string;
  statistical_forecast_usd: number;
  adjusted_forecast_usd: number;
  target_usd: number;
  forecast_vs_target_pct: number;
  confidence: "LOW" | "MEDIUM" | "HIGH" | string;
  narrative: string;
  top_risks: string[];
  top_opportunities: string[];
  recommended_actions: string[];
}

export interface RecommendationsResponse {
  recommendations: AIRecommendation[];
}

export interface OverdueActivitiesResponse {
  activities: OverdueActivity[];
}

export type UserRole = "ACCOUNT_MANAGER" | "COUNTRY_GM" | "COUNTRY_MANAGER" | "HEAD_OF_BUSINESS" | "CEO" | "ADMIN";

export interface CrmUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  countryOfficeId?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  ownerId: string;
  stage: string;
  valueUsd: number;
  probability: number;
  expectedCloseDate: string;
  country: string;
  sector: string;
}

export interface TenantAlert {
  id: string;
  tenantName: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface CrossSellOpportunity {
  id: string;
  tenantName: string;
  serviceName: string;
  valueUsd: number;
  confidence: number;
}

export interface Renewal {
  id: string;
  tenantName: string;
  renewalDate: string;
  valueUsd: number;
  ownerName: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  ownerName: string;
  tenantName: string;
}

export interface TeamPerformance {
  id: string;
  name: string;
  role: UserRole;
  revenueUsd: number;
  pipelineUsd: number;
  targetAttainment: number;
}

export interface RevenuePoint {
  name: string;
  revenue: number;
  target?: number;
}
