import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import type { GeneratedPreTradeBrief, PreTradeBriefInput } from "@/types/preTradeBrief";

const SAFETY_DISCLAIMER =
  "This analysis is decision-support only, not financial advice, and does not guarantee outcomes.";

const cleanText = (value: string): string => {
  const blockedPhrases = [
    /guaranteed?/gi,
    /certain(ty)?/gi,
    /can't lose/gi,
    /must win/gi,
    /take this trade now/gi,
  ];

  let output = value;
  blockedPhrases.forEach((pattern) => {
    output = output.replace(pattern, "high-confidence");
  });

  return output.trim();
};

const toStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return normalized.length ? normalized : fallback;
};

const fallbackBrief = (input: PreTradeBriefInput): GeneratedPreTradeBrief => ({
  summary: cleanText(
    `${input.pairSymbol} ${input.timeframe} plan captured with ${input.marketSession} session context and ${input.directionalBiasInput} directional idea. ${SAFETY_DISCLAIMER}`
  ),
  bias: cleanText(
    `${input.directionalBiasInput.toUpperCase()} bias is user-provided and should be confirmed against structure, session behavior, and risk rules.`
  ),
  confluence: [
    "Confirm higher timeframe structure alignment.",
    "Check session volatility behavior before execution.",
    "Ensure entry plan aligns with invalidation level.",
  ],
  risks: [
    "Directional view may fail if market structure shifts.",
    "Session volatility spikes can invalidate planned entries.",
    "Unexpected macro headlines can reduce setup reliability.",
  ],
  invalidationSignals: [
    "Price closes beyond planned invalidation zone.",
    "Momentum fails to confirm the planned direction.",
    "Risk parameters no longer fit account rules.",
  ],
  checklist: [
    "Position size respects account risk limit.",
    "Entry, stop-loss, and take-profit are defined before execution.",
    "No certainty assumptions; scenario-based execution only.",
  ],
});

const parseModelOutput = (rawText: string, input: PreTradeBriefInput): GeneratedPreTradeBrief => {
  try {
    const parsed = JSON.parse(rawText);

    return {
      summary: cleanText(String(parsed.summary || "")) || fallbackBrief(input).summary,
      bias: cleanText(String(parsed.bias || "")) || fallbackBrief(input).bias,
      confluence: toStringArray(parsed.confluence, fallbackBrief(input).confluence),
      risks: toStringArray(parsed.risks, fallbackBrief(input).risks),
      invalidationSignals: toStringArray(parsed.invalidationSignals, fallbackBrief(input).invalidationSignals),
      checklist: toStringArray(parsed.checklist, fallbackBrief(input).checklist),
    };
  } catch {
    return fallbackBrief(input);
  }
};

export async function generatePreTradeBrief(input: PreTradeBriefInput): Promise<GeneratedPreTradeBrief> {
  const prompt = `You are Tradia's Forex pre-trade analysis assistant.

Task:
Return only valid JSON with this exact shape:
{
  "summary": "string",
  "bias": "string",
  "confluence": ["string"],
  "risks": ["string"],
  "invalidationSignals": ["string"],
  "checklist": ["string"]
}

Safety rules:
- Decision-support only, never certainty.
- Never promise profits.
- Never use directives like \"take this trade now\".
- Keep language conservative and risk-aware.
- Mention uncertainty where relevant.

Context:
- Pair: ${input.pairSymbol}
- Timeframe: ${input.timeframe}
- Session: ${input.marketSession}
- Directional bias input: ${input.directionalBiasInput}
- Setup notes: ${input.setupNotes || "N/A"}
- Planned entry: ${input.plannedEntry ?? "N/A"}
- Planned stop loss: ${input.plannedStopLoss ?? "N/A"}
- Planned take profit: ${input.plannedTakeProfit ?? "N/A"}`;

  try {
    const result = await generateText({
      model: mistral("mistral-large-latest") as any,
      prompt,
      temperature: 0.2,
      maxTokens: 500,
    });

    const parsed = parseModelOutput(result.text, input);

    return {
      ...parsed,
      summary: `${parsed.summary} ${SAFETY_DISCLAIMER}`.trim(),
    };
  } catch (error) {
    console.error("Pre-trade brief AI generation failed:", error);
    return fallbackBrief(input);
  }
}

export function calculateRiskReward(
  plannedEntry?: number | null,
  plannedStopLoss?: number | null,
  plannedTakeProfit?: number | null
): number | null {
  if (
    plannedEntry == null ||
    plannedStopLoss == null ||
    plannedTakeProfit == null ||
    !Number.isFinite(plannedEntry) ||
    !Number.isFinite(plannedStopLoss) ||
    !Number.isFinite(plannedTakeProfit)
  ) {
    return null;
  }

  const risk = Math.abs(plannedEntry - plannedStopLoss);
  if (risk === 0) return null;

  const reward = Math.abs(plannedTakeProfit - plannedEntry);
  if (reward === 0) return null;

  return Math.round((reward / risk) * 100) / 100;
}
