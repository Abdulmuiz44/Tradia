import { mistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import type { GeneratedMarketBias, MarketBiasInput } from "@/types/marketBias";

const MARKET_BIAS_MODEL = "mistral-large-latest";
const MARKET_BIAS_PROMPT_VERSION = "market_bias_v1";
type ParsedMarketBias = Omit<GeneratedMarketBias, "aiModel" | "promptVersion" | "generationLatencyMs">;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 8);
  return next.length ? next : fallback;
};

const toNumberArray = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
    .slice(0, 8);
};

const fallbackBias = (input: MarketBiasInput): GeneratedMarketBias => ({
  biasDirection: "neutral",
  confidenceScore: 50,
  keyLevels: {
    support: [],
    resistance: [],
    invalidationLevel: null,
  },
  assumptions: [
    `${input.pairSymbol} is in a transitional structure with mixed signals across selected timeframes.`,
    "Session behavior and volatility expansion should confirm direction before entry decisions.",
  ],
  invalidationConditions: [
    "Directional thesis fails if market breaks structure against the intended scenario.",
    "Volatility regime change invalidates planned execution conditions.",
  ],
  alternateScenario: "If the current structure fails, switch to scenario-based planning and wait for confirmation.",
  confidenceRationale: "Confidence is moderate due to incomplete confluence and no guaranteed directional continuation.",
  aiModel: MARKET_BIAS_MODEL,
  promptVersion: MARKET_BIAS_PROMPT_VERSION,
  generationLatencyMs: 0,
});

const parseDirection = (value: unknown): GeneratedMarketBias["biasDirection"] => {
  const next = String(value ?? "").trim().toLowerCase();
  if (next === "bullish" || next === "bearish" || next === "neutral") return next;
  return "neutral";
};

const parseModelOutput = (raw: string, input: MarketBiasInput): ParsedMarketBias => {
  try {
    const parsed = JSON.parse(raw);
    const fallback = fallbackBias(input);
    return {
      biasDirection: parseDirection(parsed.biasDirection),
      confidenceScore: clamp(Number(parsed.confidenceScore) || fallback.confidenceScore, 0, 100),
      keyLevels: {
        support: toNumberArray(parsed?.keyLevels?.support),
        resistance: toNumberArray(parsed?.keyLevels?.resistance),
        invalidationLevel: Number.isFinite(Number(parsed?.keyLevels?.invalidationLevel))
          ? Number(parsed.keyLevels.invalidationLevel)
          : null,
      },
      assumptions: toStringArray(parsed.assumptions, fallback.assumptions),
      invalidationConditions: toStringArray(parsed.invalidationConditions, fallback.invalidationConditions),
      alternateScenario: String(parsed.alternateScenario || fallback.alternateScenario).trim(),
      confidenceRationale: String(parsed.confidenceRationale || fallback.confidenceRationale).trim(),
    };
  } catch {
    return fallbackBias(input);
  }
};

export async function generateMarketBias(input: MarketBiasInput): Promise<GeneratedMarketBias> {
  const startedAt = Date.now();
  const prompt = `You are Tradia's Forex market bias assistant.

Return only valid JSON with this exact shape:
{
  "biasDirection": "bullish|bearish|neutral",
  "confidenceScore": number_0_to_100,
  "keyLevels": {
    "support": [number],
    "resistance": [number],
    "invalidationLevel": number_or_null
  },
  "assumptions": ["string"],
  "invalidationConditions": ["string"],
  "alternateScenario": "string",
  "confidenceRationale": "string"
}

Rules:
- Decision-support only, no certainty language.
- Do not give direct execution commands.
- Include uncertainty where timeframes conflict.
- Keep confidence conservative.

Context:
- Pair: ${input.pairSymbol}
- Timeframes: ${input.timeframeSet.join(", ")}
- Session context: ${input.sessionContext || "N/A"}
- Recent backdrop: ${input.recentBackdrop || "N/A"}`;

  try {
    const result = await generateText({
      model: mistral(MARKET_BIAS_MODEL) as any,
      prompt,
      temperature: 0.2,
      maxTokens: 700,
    });

    const parsed = parseModelOutput(result.text, input);
    return {
      ...parsed,
      aiModel: MARKET_BIAS_MODEL,
      promptVersion: MARKET_BIAS_PROMPT_VERSION,
      generationLatencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.error("Market bias AI generation failed:", error);
    return {
      ...fallbackBias(input),
      generationLatencyMs: Date.now() - startedAt,
    };
  }
}
