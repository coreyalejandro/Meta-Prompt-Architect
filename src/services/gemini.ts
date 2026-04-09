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
    case ModelType.GPT_5_PRO: return "Industry-leading complex reasoning and ecosystem integration.";
    case ModelType.GPT_5_THINKING: return "Advanced chain-of-thought reasoning.";
    case ModelType.GPT_5_INSTANT: return "High-speed, low-latency reasoning.";
    case ModelType.GEMINI_3_1_PRO: return "1M-2M context, multimodal speed, and strong agentic capabilities.";
    case ModelType.GEMINI_3_1_FLASH: return "High-throughput multimodal speed.";
    case ModelType.GEMINI_3_ULTRA: return "Flagship reasoning and multimodal synthesis.";
    case ModelType.CLAUDE_OPUS_4_6: return "Best-in-class reasoning and complex analysis.";
    case ModelType.CLAUDE_SONNET_4_6: return "Best-in-class coding and agentic tool use.";
    case ModelType.CLAUDE_HAIKU_4_5: return "High-speed, efficient coding and writing.";
    case ModelType.LLAMA_4_SCOUT: return "Efficient, open-weights reasoning.";
    case ModelType.LLAMA_4_MAVERICK: return "Balanced open-weights performance.";
    case ModelType.LLAMA_4_BEHEMOTH: return "10M token context and massive open-weights reasoning.";
    case ModelType.GROK_4_20: return "Real-time information access and nuanced reasoning.";
    case ModelType.QWEN_3_5_397B: return "Massive context, top-tier Asian language and coding performance.";
    case ModelType.DEEPSEEK_R1: return "High-level mathematical reasoning and cost-efficient open-weights.";
    case ModelType.KIMI_K2_THINKING: return "Native multimodal and massive MoE reasoning.";
    case ModelType.DEVSTRAL_2: return "Specialized software engineering and coding.";
    case ModelType.GLM_5: return "Complex system engineering and long-horizon agentic tasks.";
    default: return "Optimize for speed and efficiency.";
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

export async function chatWithExpert(message: string, context: any): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are the Meta-Prompt Knowledge Expert. Your goal is to help users master high-dimensional prompt engineering and the Meta-Prompt Architect app.
    
    Context: ${JSON.stringify(context)}
    
    User Message: "${message}"
    
    Provide a concise, high-authority response. If the user is asking about a feature, explain it in the context of cognitive governance. If they are asking about their current prompt, offer specific architectural advice.`,
  });

  return response.text;
}

export async function redTeamAudit(instructionSet: InstructionSet): Promise<{ score: number; reasoning: string; vulnerabilities: string[] }> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are a Senior Security Auditor. Perform an adversarial red-team audit on this generated instruction set:
    
    ${instructionSet.finalPrompt}
    
    Identify potential safety bypasses, jailbreak vulnerabilities, or logical loopholes. 
    Provide a security score (1-10, where 10 is most secure), reasoning, and a list of vulnerabilities.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          reasoning: { type: Type.STRING },
          vulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["score", "reasoning", "vulnerabilities"],
      },
    },
  });

  return JSON.parse(response.text);
}
