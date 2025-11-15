// lib/emotionClassifier.ts
/**
 * Trader emotion detection and classification
 * Combines regex pattern matching with HuggingFace sentiment analysis
 */

export interface EmotionResult {
  primary: string;
  score: number;
  triggers: string[];
  secondary?: string;
  tiltLevel: number; // 0-2: 0=calm, 1=elevated, 2=tilt
}

// Emotion patterns with scoring weights
const EMOTION_PATTERNS = {
  revenge: {
    patterns: [
      /make\s+it\s+back/i,
      /get\s+even/i,
      /revenge\s+trad/i,
      /chase\s+losses?/i,
      /double\s+down/i,
      /recover\s+.*\s+loss/i,
    ],
    weight: 1.5,
    tiltContribution: 0.8,
  },
  fear: {
    patterns: [
      /scared/i,
      /terrified/i,
      /stop\s+hunt/i,
      /fear/i,
      /panic/i,
      /freaking\s+out/i,
      /anxious/i,
      /worried/i,
    ],
    weight: 1.3,
    tiltContribution: 0.6,
  },
  fomo: {
    patterns: [
      /miss(?:ing|ed)\s+out/i,
      /fomo/i,
      /now\s+or\s+never/i,
      /can'?t\s+miss/i,
      /everyone\s+else\s+is/i,
      /too\s+late/i,
    ],
    weight: 1.4,
    tiltContribution: 0.7,
  },
  doubt: {
    patterns: [
      /what\s+if/i,
      /should\s+i\s+have/i,
      /fake\s?out/i,
      /wrong\s+again/i,
      /second\s+guess/i,
      /unsure/i,
      /confused/i,
    ],
    weight: 1.2,
    tiltContribution: 0.5,
  },
  anger: {
    patterns: [
      /furious/i,
      /pissed/i,
      /angry/i,
      /hate\s+this/i,
      /rigged/i,
      /bullshit/i,
      /scam/i,
      /frustrat/i,
    ],
    weight: 1.6,
    tiltContribution: 0.9,
  },
  regret: {
    patterns: [
      /should'?ve/i,
      /if\s+only/i,
      /regret/i,
      /mistake/i,
      /why\s+did\s+i/i,
      /stupid\s+move/i,
    ],
    weight: 1.3,
    tiltContribution: 0.6,
  },
  euphoria: {
    patterns: [
      /easy\s+money/i,
      /can'?t\s+lose/i,
      /on\s+fire/i,
      /crushing\s+it/i,
      /invincible/i,
    ],
    weight: 1.4,
    tiltContribution: 0.4,
  },
  calm: {
    patterns: [
      /patient/i,
      /following\s+plan/i,
      /disciplined/i,
      /waiting\s+for/i,
      /stick\s+to/i,
    ],
    weight: 1.0,
    tiltContribution: -0.5, // reduces tilt
  },
};

/**
 * Detect trader emotions from text input
 * Returns primary emotion, confidence score, and identified triggers
 */
export function detectTraderEmotion(text: string): EmotionResult {
  const lowerText = text.toLowerCase();
  const emotionScores: Record<string, { score: number; matches: string[] }> = {};

  // Check all emotion patterns
  for (const [emotion, config] of Object.entries(EMOTION_PATTERNS)) {
    let matchCount = 0;
    const matches: string[] = [];

    for (const pattern of config.patterns) {
      const match = lowerText.match(pattern);
      if (match) {
        matchCount++;
        matches.push(match[0]);
      }
    }

    if (matchCount > 0) {
      emotionScores[emotion] = {
        score: matchCount * config.weight,
        matches,
      };
    }
  }

  // Calculate tilt level
  let tiltLevel = 0;
  for (const [emotion, data] of Object.entries(emotionScores)) {
    const config = EMOTION_PATTERNS[emotion as keyof typeof EMOTION_PATTERNS];
    tiltLevel += (data.score / config.weight) * config.tiltContribution;
  }

  // Normalize tilt to 0-2 scale
  tiltLevel = Math.max(0, Math.min(2, tiltLevel));

  // Determine primary and secondary emotions
  const sortedEmotions = Object.entries(emotionScores).sort(
    ([, a], [, b]) => b.score - a.score
  );

  if (sortedEmotions.length === 0) {
    // No strong emotion detected
    return {
      primary: 'neutral',
      score: 0,
      triggers: [],
      tiltLevel: 0,
    };
  }

  const [primaryEmotion, primaryData] = sortedEmotions[0];
  const secondary = sortedEmotions.length > 1 ? sortedEmotions[1][0] : undefined;

  // Normalize score to 0-1 range
  const maxScore = 10; // Reasonable max for multiple strong matches
  const normalizedScore = Math.min(primaryData.score / maxScore, 1);

  return {
    primary: primaryEmotion,
    score: normalizedScore,
    triggers: primaryData.matches,
    secondary,
    tiltLevel,
  };
}

/**
 * Enhance emotion detection with HuggingFace sentiment analysis
 * Falls back to regex-only if HF API unavailable
 */
export async function detectTraderEmotionWithSentiment(
  text: string
): Promise<EmotionResult> {
  // Get regex-based emotion detection first
  const regexResult = detectTraderEmotion(text);

  // Try to enhance with HuggingFace if available
  try {
    const hfToken = process.env.HUGGINGFACE_API_KEY;
    
    if (!hfToken) {
      // Return regex result if no HF token
      return regexResult;
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      }
    );

    if (!response.ok) {
      // Fall back to regex result on API error
      return regexResult;
    }

    const hfResult = await response.json();
    
    // HF returns array like [{label: 'POSITIVE', score: 0.99}]
    if (Array.isArray(hfResult) && hfResult[0]?.label) {
      const sentiment = hfResult[0].label.toLowerCase();
      const sentimentScore = hfResult[0].score;

      // Adjust tilt based on sentiment
      if (sentiment === 'negative' && sentimentScore > 0.8) {
        regexResult.tiltLevel = Math.min(2, regexResult.tiltLevel + 0.3);
      } else if (sentiment === 'positive' && sentimentScore > 0.8) {
        regexResult.tiltLevel = Math.max(0, regexResult.tiltLevel - 0.2);
      }

      // If no regex emotion but strong sentiment, use sentiment
      if (regexResult.primary === 'neutral' && sentimentScore > 0.7) {
        regexResult.primary = sentiment === 'negative' ? 'fear' : 'calm';
        regexResult.score = sentimentScore;
      }
    }

    return regexResult;
  } catch (error) {
    console.warn('HuggingFace sentiment analysis failed, using regex only:', error);
    return regexResult;
  }
}

/**
 * Get emotion color for UI visualization
 */
export function getEmotionColor(emotion: string, tiltLevel: number): string {
  // High tilt overrides emotion color
  if (tiltLevel >= 1.5) return 'bg-red-500';
  if (tiltLevel >= 1.0) return 'bg-orange-500';

  const colorMap: Record<string, string> = {
    revenge: 'bg-red-500',
    anger: 'bg-red-600',
    fear: 'bg-yellow-500',
    fomo: 'bg-orange-500',
    doubt: 'bg-blue-400',
    regret: 'bg-purple-500',
    euphoria: 'bg-pink-500',
    calm: 'bg-green-500',
    neutral: 'bg-gray-400',
  };

  return colorMap[emotion] || 'bg-gray-400';
}

/**
 * Get coaching message for detected emotion
 */
export function getEmotionCoachingHint(emotion: string, tiltLevel: number): string {
  if (tiltLevel >= 1.5) {
    return '🚨 HIGH TILT DETECTED - Consider taking a break';
  }

  const hints: Record<string, string> = {
    revenge: '⚠️ Revenge trading detected - Review your risk rules',
    anger: '😤 High emotion - Step away and breathe',
    fear: '😰 Fear response - Trust your process',
    fomo: '🏃 FOMO detected - Stick to your plan',
    doubt: '🤔 Second-guessing - Review your analysis',
    regret: '😞 Regret pattern - Learn and move forward',
    euphoria: '🎉 Overconfidence alert - Stay grounded',
    calm: '✅ Good emotional state - Keep it up',
    neutral: '📊 Analyzing...',
  };

  return hints[emotion] || '📊 Monitoring your state...';
}
