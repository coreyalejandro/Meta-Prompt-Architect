import { InstructionSet } from '../types';

export function generateCursorRules(instructionSet: InstructionSet): string {
  return `
# Meta-Prompt Architect Ruleset
# Generated: ${new Date().toISOString()}

${instructionSet.systemRole}

## Cognitive Stack
${instructionSet.cognitiveStack.map(s => `- ${s}`).join('\n')}

## Verification Gates
${instructionSet.verificationGates.map(s => `- ${s}`).join('\n')}

## Core Instructions
${instructionSet.finalPrompt}
`;
}
