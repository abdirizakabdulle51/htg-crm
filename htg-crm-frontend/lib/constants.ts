export const PIPELINE_STAGES = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export const RISK_THRESHOLDS = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
} as const;

export const HEALTH_COLORS = {
  healthy: "emerald",
  watch: "amber",
  risk: "red",
} as const;
