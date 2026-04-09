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

export interface PIIFinding {
  type: string;
  value: string;
  index: number;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  intent: UserIntent;
  results: {
    audit: AuditResult;
    stress: StressTestResult;
    instructionSet: InstructionSet;
  };
}

export interface UserIntent {
  raw: string;
  targetModel: ModelType;
  useLCI: boolean;
  lciConfig: {
    contextWindow: number;
    compressionRatio: number;
  };
  highRisk: boolean;
  theme: ThemeType;
}

export interface AuditResult {
  assumptions: string[];
  edgeCases: string[];
  truthSurface: string[];
}

export interface StressTestResult {
  criticArgument: string;
  logicOptimization: string;
  resolution: string;
}

export interface InstructionSet {
  systemRole: string;
  cognitiveStack: string[];
  verificationGates: string[];
  handoffArtifacts: string[];
  verbalizedSampling?: string;
  finalPrompt: string;
}

export interface Retrospective {
  failureReason: string;
  suggestedUpdate: string;
}

export interface MemoryState {
  key: string;
  value: string;
  lastUpdated: string;
}
