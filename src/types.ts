import { z } from 'zod';

export enum ModelType {
  GPT_5_PRO = "gpt-5.4-pro",
  GPT_5_THINKING = "gpt-5.3-thinking",
  GPT_5_INSTANT = "gpt-5-instant",
  GEMINI_3_1_PRO = "gemini-3.1-pro",
  GEMINI_3_1_FLASH = "gemini-3.1-flash",
  GEMINI_3_ULTRA = "gemini-3-ultra",
  CLAUDE_OPUS_4_6 = "claude-opus-4.6",
  CLAUDE_SONNET_4_6 = "claude-sonnet-4.6",
  CLAUDE_HAIKU_4_5 = "claude-haiku-4.5",
  LLAMA_4_SCOUT = "llama-4-scout",
  LLAMA_4_MAVERICK = "llama-4-maverick",
  LLAMA_4_BEHEMOTH = "llama-4-behemoth",
  GROK_4_20 = "grok-4.20",
  QWEN_3_5_397B = "qwen-3.5-397b",
  DEEPSEEK_R1 = "deepseek-r1",
  KIMI_K2_THINKING = "kimi-k2.5-thinking",
  DEVSTRAL_2 = "devstral-2",
  GLM_5 = "glm-5"
}

export enum ThemeType {
  DARK = "dark",
  LIGHT = "light",
  HIGH_CONTRAST = "high-contrast"
}

export const UserIntentSchema = z.object({
  raw: z.string(),
  targetModel: z.nativeEnum(ModelType),
  useLCI: z.boolean(),
  lciConfig: z.object({
    contextWindow: z.number(),
    compressionRatio: z.number(),
  }),
  highRisk: z.boolean(),
  theme: z.nativeEnum(ThemeType),
  compliance: z.string().optional(),
});

export const AuditResultSchema = z.object({
  assumptions: z.array(z.string()),
  edgeCases: z.array(z.string()),
  truthSurface: z.array(z.string()),
});

export const StressTestResultSchema = z.object({
  criticArgument: z.string(),
  logicOptimization: z.string(),
  resolution: z.string(),
});

export const InstructionSetSchema = z.object({
  systemRole: z.string(),
  cognitiveStack: z.array(z.string()),
  verificationGates: z.array(z.string()),
  handoffArtifacts: z.array(z.string()),
  verbalizedSampling: z.string().optional(),
  finalPrompt: z.string(),
});

export const HistoryItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  intent: UserIntentSchema,
  results: z.object({
    audit: AuditResultSchema,
    stress: StressTestResultSchema,
    instructionSet: InstructionSetSchema,
  }),
});

export const MemoryStateSchema = z.object({
  key: z.string(),
  value: z.string(),
  lastUpdated: z.string(),
});

export type UserIntent = z.infer<typeof UserIntentSchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;
export type StressTestResult = z.infer<typeof StressTestResultSchema>;
export type InstructionSet = z.infer<typeof InstructionSetSchema>;
export type HistoryItem = z.infer<typeof HistoryItemSchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;

export const WORMAuditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.enum(['GENERATE', 'EXPORT_JSON', 'EXPORT_MD', 'EXPORT_CURSOR', 'REDACT_PII']),
  userId: z.string(), // Simulated user ID
  details: z.any(),
  hash: z.string() // Simulated cryptographic hash of the record to ensure immutability
});

export type WORMAuditLog = z.infer<typeof WORMAuditLogSchema>;

export interface WorkflowStep {
  id: string;
  name: string;
  intent: string;
  targetModel: ModelType;
  dependsOn: string[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  result?: InstructionSet;
  error?: string;
}

export interface PIIFinding {
  type: string;
  value: string;
  index: number;
}

export interface Retrospective {
  failureReason: string;
  suggestedUpdate: string;
}
