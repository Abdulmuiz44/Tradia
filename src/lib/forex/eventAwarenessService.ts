import type { EconomicEvent, EventRiskAction, EventRiskReport } from "@/types/eventAwareness";

const impactRank: Record<EconomicEvent["impact"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

const minutesBetween = (a: Date, b: Date): number => Math.round((a.getTime() - b.getTime()) / 60000);

export function evaluateEventRisk(
  events: EconomicEvent[],
  plannedAtIso: string | null | undefined,
  pairSymbol: string
): EventRiskReport {
  const plannedAt = plannedAtIso ? new Date(plannedAtIso) : new Date();
  if (Number.isNaN(plannedAt.getTime())) {
    return {
      action: "proceed",
      summary: "No reliable planned execution time provided; proceed with normal event checks.",
      windowStart: null,
      windowEnd: null,
      relevantEvents: [],
    };
  }

  const sorted = [...events].sort((a, b) => {
    const deltaImpact = impactRank[b.impact] - impactRank[a.impact];
    if (deltaImpact !== 0) return deltaImpact;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  });

  if (!sorted.length) {
    return {
      action: "proceed",
      summary: `No mapped high-impact events near planned ${pairSymbol} execution window.`,
      windowStart: null,
      windowEnd: null,
      relevantEvents: [],
    };
  }

  let action: EventRiskAction = "proceed";
  const highlighted: EconomicEvent[] = [];
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;

  for (const event of sorted) {
    const when = new Date(event.scheduled_at);
    if (Number.isNaN(when.getTime())) continue;
    const diffMin = minutesBetween(when, plannedAt);
    const absDiff = Math.abs(diffMin);

    // Strict "wait" gate: high impact event within +/- 30 minutes of planned execution.
    if (event.impact === "high" && absDiff <= 30) {
      action = "wait";
      highlighted.push(event);
    } else if (event.impact === "high" && absDiff <= 120 && action !== "wait") {
      // Caution band: high impact within 2 hours.
      action = "size_down";
      highlighted.push(event);
    } else if (event.impact === "medium" && absDiff <= 60 && action === "proceed") {
      action = "size_down";
      highlighted.push(event);
    }

    if (action !== "proceed") {
      windowStart = windowStart ? new Date(Math.min(windowStart.getTime(), when.getTime())) : when;
      windowEnd = windowEnd ? new Date(Math.max(windowEnd.getTime(), when.getTime())) : when;
    }
  }

  const summary =
    action === "wait"
      ? "High-impact event risk is inside the immediate execution window. Wait until post-release volatility normalizes."
      : action === "size_down"
      ? "Event risk is elevated near execution. Consider reduced size and stricter invalidation."
      : "No critical event conflicts detected in the planned execution window.";

  return {
    action,
    summary,
    windowStart: windowStart?.toISOString() ?? null,
    windowEnd: windowEnd?.toISOString() ?? null,
    relevantEvents: highlighted.length ? highlighted : sorted.slice(0, 3),
  };
}
