import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { UserIntent, AuditResult, StressTestResult, InstructionSet, HistoryItem, PIIFinding, CrossModelParityResult, ConstitutionalMappingResult } from '../types';

interface ExportData {
  intent: UserIntent;
  audit: AuditResult | null;
  stress: StressTestResult | null;
  instructionSet: InstructionSet | null;
  redTeamResults: { score: number; reasoning: string; vulnerabilities: string[] } | null;
  crossModelParity: CrossModelParityResult | null;
  constitutionalMapping: ConstitutionalMappingResult | null;
  roiAnalytics: { timeSaved: number, costSaved: number, totalGenerations: number } | null;
}

export async function generateExportBundle(data: ExportData) {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bundleName = `architect-bundle-${timestamp}`;

  // 1. JSON Export
  zip.file(`${bundleName}/raw-data.json`, JSON.stringify(data, null, 2));

  // 2. Markdown Export
  const markdown = generateMarkdown(data);
  zip.file(`${bundleName}/architecture-report.md`, markdown);

  // 3. Instruction Set Only (Clean for AI usage)
  if (data.instructionSet) {
    zip.file(`${bundleName}/final-instruction-set.txt`, data.instructionSet.finalPrompt);
  }

  // 4. PDF Generation (Summary)
  const pdf = generatePDF(data);
  const pdfBlob = pdf.output('blob');
  zip.file(`${bundleName}/compliance-certificate.pdf`, pdfBlob);

  // Generate ZIP
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${bundleName}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

function generateMarkdown(data: ExportData): string {
  let md = `# Meta-Prompt Architecture Report\n\n`;
  md += `## Intent Scan\n${data.intent.raw}\n\n`;
  
  if (data.audit) {
    md += `## Audit Findings\n### Assumptions\n- ${data.audit.assumptions.join('\n- ')}\n`;
    md += `### Edge Cases\n- ${data.audit.edgeCases.join('\n- ')}\n`;
    md += `### Truth Surface\n- ${data.audit.truthSurface.join('\n- ')}\n\n`;
  }

  if (data.stress) {
    md += `## Stress Test\n### Critic Argument\n${data.stress.criticArgument}\n`;
    md += `### Logic Optimization\n${data.stress.logicOptimization}\n`;
    md += `### Resolution\n${data.stress.resolution}\n\n`;
  }

  if (data.instructionSet) {
    md += `## Generated Instruction Set\n\`\`\`\n${data.instructionSet.finalPrompt}\n\`\`\`\n\n`;
  }

  if (data.constitutionalMapping) {
    md += `## Constitutional Mapping\n`;
    data.constitutionalMapping.standards.forEach(std => {
      md += `### ${std.standard} (${std.coverage}%)\n- ${std.mappedClauses.join('\n- ')}\n`;
    });
    md += `\n`;
  }

  if (data.redTeamResults) {
    md += `## Red Team Audit\n**Score: ${data.redTeamResults.score}/10**\n`;
    md += `### Reasoning\n${data.redTeamResults.reasoning}\n`;
    md += `### Vulnerabilities\n- ${data.redTeamResults.vulnerabilities.join('\n- ')}\n\n`;
  }

  return md;
}

function generatePDF(data: ExportData): jsPDF {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(22);
  doc.text("Architect Compliance Certificate", 20, y);
  y += 15;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, y);
  y += 15;

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text("Core Identity:", 20, y);
  y += 7;
  doc.setFontSize(10);
  const intentLines = doc.splitTextToSize(data.intent.raw.substring(0, 500) + (data.intent.raw.length > 500 ? '...' : ''), 170);
  doc.text(intentLines, 20, y);
  y += (intentLines.length * 5) + 10;

  if (data.constitutionalMapping) {
    doc.setFontSize(14);
    doc.text("Regulatory Coverage:", 20, y);
    y += 10;
    data.constitutionalMapping.standards.forEach(std => {
      doc.setFontSize(10);
      doc.text(`${std.standard}: ${std.coverage}%`, 25, y);
      y += 7;
    });
  }

  y += 10;
  if (data.redTeamResults) {
    doc.setFontSize(14);
    doc.text("Security Index:", 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Adversarial Resilience Score: ${data.redTeamResults.score}/10`, 25, y);
    y += 7;
  }

  return doc;
}
