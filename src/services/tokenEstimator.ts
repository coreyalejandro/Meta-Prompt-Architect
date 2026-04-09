import { ModelType } from '../types';

// Simplified pricing per 1M tokens (Input/Output)
const MODEL_PRICING: Record<ModelType, { input: number; output: number }> = {
  [ModelType.GPT_5_PRO]: { input: 10, output: 30 },
  [ModelType.GPT_5_THINKING]: { input: 15, output: 45 },
  [ModelType.GPT_5_INSTANT]: { input: 2, output: 6 },
  [ModelType.GEMINI_3_1_PRO]: { input: 8, output: 24 },
  [ModelType.GEMINI_3_1_FLASH]: { input: 0.5, output: 1.5 },
  [ModelType.GEMINI_3_ULTRA]: { input: 12, output: 36 },
  [ModelType.CLAUDE_OPUS_4_6]: { input: 15, output: 75 },
  [ModelType.CLAUDE_SONNET_4_6]: { input: 3, output: 15 },
  [ModelType.CLAUDE_HAIKU_4_5]: { input: 0.25, output: 1.25 },
  [ModelType.LLAMA_4_SCOUT]: { input: 0.1, output: 0.2 },
  [ModelType.LLAMA_4_MAVERICK]: { input: 0.5, output: 1 },
  [ModelType.LLAMA_4_BEHEMOTH]: { input: 2, output: 4 },
  [ModelType.GROK_4_20]: { input: 5, output: 15 },
  [ModelType.QWEN_3_5_397B]: { input: 1, output: 2 },
  [ModelType.DEEPSEEK_R1]: { input: 0.5, output: 1 },
  [ModelType.KIMI_K2_THINKING]: { input: 2, output: 6 },
  [ModelType.DEVSTRAL_2]: { input: 1, output: 3 },
  [ModelType.GLM_5]: { input: 1, output: 3 },
};

export function estimateCost(model: ModelType, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || { input: 1, output: 3 };
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
