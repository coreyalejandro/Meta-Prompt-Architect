export enum ModelType {
  GEMINI_2_0_PRO = "gemini-2.0-pro-exp",
  GEMINI_2_0_FLASH = "gemini-2.0-flash",
  CLAUDE_3_7_SONNET = "claude-3.7-sonnet",
  CLAUDE_3_5_SONNET = "claude-3.5-sonnet",
  GPT_4O = "gpt-4o",
  DEEPSEEK_V3 = "deepseek-v3",
  KIMI_V1 = "kimi-v1",
  CURSOR_AGENT = "cursor-agent",
  CLAUDE_CODE = "claude-code",
  OPENAI_CODEX = "openai-codex"
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
