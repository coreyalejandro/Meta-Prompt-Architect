import { GoogleGenAI, Type } from "@google/genai";
import { UserIntent, AuditResult, StressTestResult, InstructionSet, ModelType, Retrospective, PIIFinding, MemoryState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Essential: PII/Sensitive Data Scanner
export function scanForPII(text: string): PIIFinding[] {
  const findings: PIIFinding[] = [];
  const patterns = [
    { type: 'EMAIL', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
    { type: 'PHONE', regex: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g },
    { type: 'API_KEY', regex: /(sk|ak|key)-[a-zA-Z0-9]{20,}/g }
  ];

  patterns.forEach(p => {
    let match;
    while ((match = p.regex.exec(text)) !== null) {
      findings.push({ type: p.type, value: match[0], index: match.index });
    }
  });
  return findings;
}

// Essential: Model-Specific Reasoning Adapters
const getModelStrengths = (model: ModelType) => {
  switch (model) {
    case ModelType.GEMINI_2_0_PRO:
      return "Focus on extreme reasoning, long-context (2M+), and complex multi-modal synthesis.";
    case ModelType.GEMINI_2_0_FLASH:
      return "Optimize for low-latency, high-throughput, and tool-use efficiency.";
    case ModelType.CLAUDE_3_7_SONNET:
      return "Prioritize hybrid reasoning (thinking) and high-fidelity code generation.";
    case ModelType.CLAUDE_3_5_SONNET:
      return "Prioritize nuanced coding logic and creative synthesis.";
    case ModelType.GPT_4O:
      return "Leverage strong instruction following and balanced reasoning.";
    case ModelType.DEEPSEEK_V3:
      return "Optimize for high-efficiency reasoning, coding, and mathematical logic.";
    case ModelType.KIMI_V1:
      return "Focus on long-context understanding (200k+) and nuanced Chinese-English synthesis.";
    case ModelType.CURSOR_AGENT:
      return "Optimize for repository-wide context, codebase indexing, and iterative file edits.";
    case ModelType.CLAUDE_CODE:
      return "Focus on terminal-based execution, agentic tool-use, and direct filesystem manipulation.";
    case ModelType.OPENAI_CODEX:
      return "Legacy focus on raw code completion and function-level logic.";
    default:
      return "Optimize for speed and efficiency.";
  }
};

export async function auditIntent(intent: UserIntent): Promise<AuditResult> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Analyze this user intent for a prompt: "${intent.raw}". 
    Identify implicit assumptions, 3 critical edge cases, and the "Truth Surface" (required external data).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
          edgeCases: { type: Type.ARRAY, items: { type: Type.STRING } },
          truthSurface: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["assumptions", "edgeCases", "truthSurface"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function stressTest(intent: UserIntent, audit: AuditResult): Promise<StressTestResult> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Stress-test this intent: "${intent.raw}" based on these audit findings: ${JSON.stringify(audit)}.
    Provide a Critic's argument, Logic optimization, and a Resolution into a "Steel-man" instruction set.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          criticArgument: { type: Type.STRING },
          logicOptimization: { type: Type.STRING },
          resolution: { type: Type.STRING },
        },
        required: ["criticArgument", "logicOptimization", "resolution"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function generateInstructionSet(
  intent: UserIntent, 
  stress: StressTestResult, 
  memory: MemoryState[] = []
): Promise<InstructionSet> {
  const modelStrengths = getModelStrengths(intent.targetModel);
  const memoryContext = memory.length > 0 ? `\nPersistent Memory Context: ${JSON.stringify(memory)}` : "";

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Generate a high-dimensional Instruction Set for intent: "${intent.raw}" using resolution: "${stress.resolution}".
    Target Model: ${intent.targetModel}. 
    Model-Specific Optimization: ${modelStrengths}
    Use LCI: ${intent.useLCI}. 
    LCI Configuration: Context Window=${intent.lciConfig.contextWindow} tokens, Compression Ratio=${intent.lciConfig.compressionRatio}:1.
    High Risk: ${intent.highRisk}.${memoryContext}
    
    CRITICAL: Use "Advanced Verbalized Sampling". Before finalizing the prompt, perform an internal evaluation of 3 different prompt architectures (e.g., Chain-of-Thought, Few-Shot, Role-Based). 
    Select the most robust one and explain WHY in the 'verbalizedSampling' field.
    
    POLICY ALIGNMENT: Ensure the prompt adheres to safety, neutrality, and ethical guidelines. Flag any potential violations in the cognitive stack.
    
    Include System Role, Cognitive Stack, Verification Gates, Handoff Artifacts, Verbalized Sampling explanation, and the Final Prompt.
    
    CRITICAL: The 'finalPrompt' MUST start with a 'BOOTSTRAP_COMMAND' section that tells the user exactly what to type first in their target AI session. 
    It MUST also include a 'USAGE_INSTRUCTIONS' section for a user with zero prior knowledge.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          systemRole: { type: Type.STRING },
          cognitiveStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          verificationGates: { type: Type.ARRAY, items: { type: Type.STRING } },
          handoffArtifacts: { type: Type.ARRAY, items: { type: Type.STRING } },
          verbalizedSampling: { type: Type.STRING },
          finalPrompt: { type: Type.STRING },
        },
        required: ["systemRole", "cognitiveStack", "verificationGates", "handoffArtifacts", "verbalizedSampling", "finalPrompt"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function getRetrospective(failedStep: string): Promise<Retrospective> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `Analyze this failed step log: "${failedStep}". 
    Provide a failure reason and a suggested update to the BUILD_CONTRACT.template.md.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          failureReason: { type: Type.STRING },
          suggestedUpdate: { type: Type.STRING },
        },
        required: ["failureReason", "suggestedUpdate"],
      },
    },
  });

  return JSON.parse(response.text);
}
