export type EventImpact = "low" | "medium" | "high";
export type EventRiskAction = "proceed" | "size_down" | "wait";

export interface EconomicEvent {
  id: string;
  title: string;
  currency: string;
  country?: string | null;
  impact: EventImpact;
  scheduled_at: string;
}

export interface EventRiskReport {
  action: EventRiskAction;
  summary: string;
  windowStart: string | null;
  windowEnd: string | null;
  relevantEvents: EconomicEvent[];
}
