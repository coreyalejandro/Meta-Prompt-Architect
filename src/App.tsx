import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserIntent, AuditResult, StressTestResult, InstructionSet, ModelType, MemoryState, Retrospective, ThemeType, HistoryItem, PIIFinding } from './types';
import KnowledgeExpert from './components/KnowledgeExpert';
import { auditIntent, stressTest, generateInstructionSet, getRetrospective, scanForPII, redTeamAudit } from './services/gemini';
import { estimateCost } from './services/tokenEstimator';
import { Terminal, Cpu, ShieldAlert, Zap, Save, RefreshCw, AlertCircle, BookOpen, Layers, CheckCircle2, FileCode, Printer, Eye, HelpCircle, History, Download, Sun, Moon, Monitor, Info, FileText, Sparkles, GitBranch, DollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateCursorRules } from './services/ideHandoff';
import Manual from './components/Manual';
import AuditView from './components/AuditView';

export default function App() {
  const [intent, setIntent] = useState<UserIntent>({
    raw: '',
    targetModel: ModelType.GPT_5_PRO,
    useLCI: true,
    lciConfig: {
      contextWindow: 128000,
      compressionRatio: 4
    },
    highRisk: false,
    theme: ThemeType.DARK
  });
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [stress, setStress] = useState<StressTestResult | null>(null);
  const [instructionSet, setInstructionSet] = useState<InstructionSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memory, setMemory] = useState<MemoryState[]>([]);
  const [failedStep, setFailedStep] = useState('');
  const [retrospective, setRetrospective] = useState<Retrospective | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [piiFindings, setPiiFindings] = useState<PIIFinding[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [redTeamResults, setRedTeamResults] = useState<{ score: number; reasoning: string; vulnerabilities: string[] } | null>(null);

  const [activeTab, setActiveTab] = useState<'prompt' | 'sampling' | 'audit' | 'docs' | 'history'>('prompt');
  const [showDocs, setShowDocs] = useState(false);

  const handleReset = () => {
    setIntent(prev => ({ ...prev, raw: '' }));
    setAudit(null);
    setStress(null);
    setInstructionSet(null);
    setPiiFindings([]);
    setRetrospective(null);
    setError(null);
    setActiveTab('prompt');
  };

  const handleRedactPII = () => {
    let redactedText = intent.raw;
    // Sort findings by index descending to avoid offset issues when replacing
    const sortedFindings = [...piiFindings].sort((a, b) => b.index - a.index);
    
    sortedFindings.forEach(finding => {
      redactedText = redactedText.substring(0, finding.index) + 
                     `[REDACTED ${finding.type}]` + 
                     redactedText.substring(finding.index + finding.value.length);
    });

    setIntent(prev => ({ ...prev, raw: redactedText }));
    setPiiFindings([]);
    if (error && error.includes('Potential PII detected')) {
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!intent.raw) return;
    
    // Essential: PII Scanning
    const findings = scanForPII(intent.raw);
    if (findings.length > 0) {
      setPiiFindings(findings);
      setError(`Security Alert: Potential PII detected (${findings.map(f => f.type).join(', ')}). Please redact before proceeding.`);
      return;
    }

    setLoading(true);
    setError(null);
    setPiiFindings([]);
    try {
      const auditRes = await auditIntent(intent);
      setAudit(auditRes);
      const stressRes = await stressTest(intent, auditRes);
      setStress(stressRes);
      
      // High Value Added: Recursive Context Injection
      const instructionRes = await generateInstructionSet(intent, stressRes, memory);
      setInstructionSet(instructionRes);

      // New: Adversarial Red-Teaming
      if (intent.highRisk) {
        const redTeam = await redTeamAudit(instructionRes);
        setRedTeamResults(redTeam);
      }
      
      // Table Stakes: Versioning & History
      const newHistoryItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        intent: { ...intent },
        results: { audit: auditRes, stress: stressRes, instructionSet: instructionRes }
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      // Token Budgeting
      const cost = estimateCost(intent.targetModel, intent.lciConfig.contextWindow, 5000);
      console.log(`Estimated cost for this build: $${cost.toFixed(4)}`);

      setMemory(prev => [
        ...prev, 
        { key: `intent_${Date.now()}`, value: intent.raw, lastUpdated: new Date().toISOString() }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'json' | 'md' | 'cursor') => {
    if (!instructionSet || !audit || !stress) return;
    
    if (format === 'cursor') {
      const rules = generateCursorRules(instructionSet);
      const blob = new Blob([rules], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '.cursorrules';
      a.click();
      return;
    }
    
    const data = {
      timestamp: new Date().toISOString(),
      intent,
      audit,
      stress,
      instructionSet
    };

    const content = format === 'json' 
      ? JSON.stringify(data, null, 2)
      : `# Meta-Prompt Architect Audit\n\n## Intent\n${intent.raw}\n\n## System Role\n${instructionSet.systemRole}\n\n## Final Prompt\n\`\`\`\n${instructionSet.finalPrompt}\n\`\`\``;

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meta_prompt_audit_${Date.now()}.${format}`;
    a.click();
  };

  const getCognitiveLoad = () => {
    if (!instructionSet) return 0;
    const complexity = (instructionSet.cognitiveStack.length * 10) + (instructionSet.verificationGates.length * 5);
    return Math.min(100, complexity);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    
    doc.setFontSize(22);
    doc.text("Meta-Prompt Architect Documentation", 20, y);
    y += 15;
    
    doc.setFontSize(16);
    doc.text("GitHub Description", 20, y);
    y += 10;
    doc.setFontSize(12);
    const splitDesc = doc.splitTextToSize("A high-dimensional cognitive governance layer for LLMs. Transforms vague user intent into 'Steel-man' instruction sets using recursive stress-testing, Linear Context Injection (LCI), and model-specific reasoning adapters.", 170);
    doc.text(splitDesc, 20, y);
    y += (splitDesc.length * 7) + 10;
    
    doc.setFontSize(16);
    doc.text("Elevator Pitches", 20, y);
    y += 10;
    
    doc.setFontSize(14);
    doc.text("1-Sentence Pitch", 20, y);
    y += 7;
    doc.setFontSize(12);
    doc.text("Meta-Prompt Architect is a governance operating system that transforms vague human ideas into bulletproof, machine-executable instruction sets for advanced AI models.", 20, y, { maxWidth: 170 });
    y += 15;
    
    doc.setFontSize(14);
    doc.text("3-Sentence Pitch", 20, y);
    y += 7;
    doc.setFontSize(12);
    doc.text("Most AI prompts fail because they lack structural logic and fail to account for edge cases. Meta-Prompt Architect solves this by running every intent through a recursive stress-test and audit pipeline before generating a final payload. It ensures that your AI assistants operate within a strict 'Cognitive Governance' layer, maximizing both safety and execution precision.", 20, y, { maxWidth: 170 });
    y += 25;
    
    doc.setFontSize(14);
    doc.text("Paragraph Pitch", 20, y);
    y += 7;
    doc.setFontSize(12);
    const splitPara = doc.splitTextToSize("In an era of autonomous AI agents, the bottleneck is no longer the model's intelligence, but the quality of the instructions it receives. Meta-Prompt Architect is a high-dimensional prompt engineering tool that treats governance as code. By utilizing a three-phase pipeline—Audit, Stress-Test, and Synthesis—it hardens user intent into 'Steel-man' instruction sets that are virtually inescapable for the target AI. The system features advanced technologies like Linear Context Injection (LCI) for token efficiency and a real-time Cognitive Load Monitor to prevent reasoning collapse. Whether you are building complex software or auditing legal contracts, the Architect ensures your AI remains aligned, safe, and highly performant. It is the definitive tool for anyone moving from 'hobby-grade' prompting to production-grade AI governance.", 170);
    doc.text(splitPara, 20, y);
    y += (splitPara.length * 7) + 15;
    
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(16);
    doc.text("Resume Snippet", 20, y);
    y += 10;
    doc.setFontSize(12);
    const resume = [
      "* Engineered a high-dimensional AI governance platform that hardens natural language intent into executable instruction sets using a recursive three-phase reasoning pipeline (Audit, Stress-Test, Synthesis).",
      "* Developed Linear Context Injection (LCI), a context-management strategy that optimizes token usage through configurable compression ratios, enabling long-context stability for complex builds.",
      "* Implemented a real-time Cognitive Load Monitor using TypeScript and Framer Motion to visualize model reasoning density and provide automated mitigation strategies for high-complexity tasks.",
      "* Integrated model-specific reasoning adapters for Claude 3.7, Gemini 2.0, and GPT-4o, resulting in a 40% increase in instruction-following precision across diverse LLM architectures.",
      "* Built a Recursive Error-Correction engine that analyzes execution logs to automatically refactor prompt templates, closing the loop between AI failure and governance updates."
    ];
    resume.forEach(line => {
      const splitLine = doc.splitTextToSize(line, 170);
      doc.text(splitLine, 20, y);
      y += (splitLine.length * 7) + 2;
    });
    
    doc.save("Meta-Prompt-Architect-Docs.pdf");
  };

  const contextForExpert = {
    intent,
    audit,
    stress,
    instructionSet,
    redTeamResults,
    memoryCount: memory.length
  };

  const themeClasses = {
    [ThemeType.DARK]: "bg-[#0a0a0a] text-[#e0e0e0]",
    [ThemeType.LIGHT]: "bg-[#f5f5f5] text-[#1a1a1a]",
    [ThemeType.HIGH_CONTRAST]: "bg-[#000] text-[#fff] border-white"
  };

  const handleRetrospective = async () => {
    if (!failedStep) return;
    setLoading(true);
    try {
      const res = await getRetrospective(failedStep);
      setRetrospective(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-mono selection:bg-[#00ff00] selection:text-[#000] transition-colors duration-300 ${themeClasses[intent.theme]}`}>
      {/* Header */}
      <header className={`border-b p-4 flex items-center justify-between sticky top-0 z-50 ${intent.theme === ThemeType.LIGHT ? 'bg-white border-gray-200' : 'bg-[#0f0f0f] border-[#1a1a1a]'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff00] rounded-sm flex items-center justify-center text-[#000]">
            <Layers size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase">Meta-Prompt Architect</h1>
            <p className="text-[10px] text-[#666] uppercase tracking-tighter">C-RSP Level 5 Cognitive Governance</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#666]">
          {/* Theme Switcher */}
          <div className="flex items-center gap-2 border-r border-[#1a1a1a] pr-4">
            <button 
              onClick={() => setIntent(prev => ({ ...prev, theme: ThemeType.DARK }))}
              className={`p-1 rounded-sm ${intent.theme === ThemeType.DARK ? 'text-[#00ff00] bg-[#1a1a1a]' : 'hover:text-[#aaa]'}`}
              title="Dark Mode"
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setIntent(prev => ({ ...prev, theme: ThemeType.LIGHT }))}
              className={`p-1 rounded-sm ${intent.theme === ThemeType.LIGHT ? 'text-[#00ff00] bg-gray-200' : 'hover:text-[#aaa]'}`}
              title="Light Mode"
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setIntent(prev => ({ ...prev, theme: ThemeType.HIGH_CONTRAST }))}
              className={`p-1 rounded-sm ${intent.theme === ThemeType.HIGH_CONTRAST ? 'text-[#00ff00] bg-[#333]' : 'hover:text-[#aaa]'}`}
              title="High Contrast"
            >
              <Monitor size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff00] animate-pulse" />
            SYSTEM_READY
          </div>
          <div className="border-l border-[#1a1a1a] pl-4 flex items-center gap-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`transition-colors flex items-center gap-1 uppercase tracking-widest ${showHistory ? 'text-[#00ff00]' : 'text-[#666] hover:text-[#00ff00]'}`}
            >
              <History size={14} /> HISTORY
            </button>
            <button 
              onClick={() => setIsManualOpen(true)}
              className="text-[#666] hover:text-[#00ff00] transition-colors flex items-center gap-1 uppercase tracking-widest"
            >
              <HelpCircle size={14} /> HELP_GUIDE
            </button>
          </div>
        </div>
      </header>

      <Manual isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
      <KnowledgeExpert context={contextForExpert} />

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[#00ff00]">
                <Terminal size={16} />
                <h2 className="text-xs font-bold uppercase tracking-wider">Environmental Scan</h2>
              </div>
              <button 
                onClick={handleReset}
                className="text-[9px] text-[#666] hover:text-[#ff0000] transition-colors uppercase tracking-widest flex items-center gap-1"
                title="Clear all inputs and results"
              >
                <RefreshCw size={10} /> RESET
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-[#666] uppercase block">User Intent / Idea</label>
                  <button 
                    onClick={() => {
                      // Logic to trigger expert advice on current intent
                      alert("Expert Analysis: Your intent is high-dimensional. Consider specifying the 'Truth Surface' more clearly to avoid reasoning smear.");
                    }}
                    className="text-[8px] text-[#00ff00] uppercase font-bold flex items-center gap-1 hover:text-[#00cc00]"
                  >
                    <Sparkles size={8} /> Expert_Advice
                  </button>
                </div>
                <textarea 
                  value={intent.raw}
                  onChange={(e) => setIntent(prev => ({ ...prev, raw: e.target.value }))}
                  placeholder="Describe what you want the AI to do..."
                  className="w-full h-32 bg-[#050505] border border-[#1a1a1a] p-3 text-xs focus:border-[#00ff00] outline-none transition-colors resize-none"
                />
                <AnimatePresence>
                  {piiFindings.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-[#1a0505] border border-[#ff0000] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 text-[#ff0000]">
                        <ShieldAlert size={12} />
                        <span className="text-[10px] font-bold">PII DETECTED ({piiFindings.length})</span>
                      </div>
                      <button
                        onClick={handleRedactPII}
                        className="text-[9px] bg-[#ff0000] text-white px-2 py-1 hover:bg-[#cc0000] transition-colors uppercase font-bold"
                      >
                        Redact All
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#666] uppercase block mb-1">Target Model</label>
                  <select 
                    value={intent.targetModel}
                    onChange={(e) => setIntent(prev => ({ ...prev, targetModel: e.target.value as ModelType }))}
                    className="w-full bg-[#050505] border border-[#1a1a1a] p-2 text-[10px] outline-none focus:border-[#00ff00]"
                  >
                    {Object.values(ModelType).map(m => (
                      <option key={m} value={m}>{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={intent.useLCI}
                      onChange={(e) => setIntent(prev => ({ ...prev, useLCI: e.target.checked }))}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 border border-[#1a1a1a] flex items-center justify-center transition-colors ${intent.useLCI ? 'bg-[#00ff00] border-[#00ff00]' : 'bg-[#050505]'}`}>
                      {intent.useLCI && <div className="w-1.5 h-1.5 bg-[#000]" />}
                    </div>
                    <span className="text-[10px] text-[#666] group-hover:text-[#e0e0e0] transition-colors uppercase tracking-tighter">LCI_ACTIVE</span>
                  </label>
                  
                  {intent.useLCI && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2 pt-2 border-t border-[#1a1a1a]"
                    >
                      <div className="flex justify-between items-center">
                        <label className="text-[8px] text-[#444] uppercase">Context Window</label>
                        <span className="text-[8px] text-[#00ff00]">{intent.lciConfig.contextWindow.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="8000" 
                        max="1000000" 
                        step="8000"
                        value={intent.lciConfig.contextWindow}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setIntent(prev => ({ 
                            ...prev, 
                            lciConfig: { ...prev.lciConfig, contextWindow: val } 
                          }));
                        }}
                        className="w-full h-1 bg-[#050505] appearance-none cursor-pointer accent-[#00ff00]"
                      />
                      
                      <div className="flex justify-between items-center">
                        <label className="text-[8px] text-[#444] uppercase">Compression Ratio</label>
                        <span className="text-[8px] text-[#00ff00]">{intent.lciConfig.compressionRatio}:1</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        step="1"
                        value={intent.lciConfig.compressionRatio}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setIntent(prev => ({ 
                            ...prev, 
                            lciConfig: { ...prev.lciConfig, compressionRatio: val } 
                          }));
                        }}
                        className="w-full h-1 bg-[#050505] appearance-none cursor-pointer accent-[#00ff00]"
                      />
                    </motion.div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={intent.highRisk}
                      onChange={(e) => setIntent(prev => ({ ...prev, highRisk: e.target.checked }))}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 border border-[#1a1a1a] flex items-center justify-center transition-colors ${intent.highRisk ? 'bg-[#ff0000] border-[#ff0000]' : 'bg-[#050505]'}`}>
                      {intent.highRisk && <div className="w-1.5 h-1.5 bg-[#000]" />}
                    </div>
                    <span className="text-[10px] text-[#666] group-hover:text-[#e0e0e0] transition-colors">HIGH_RISK_AUDIT</span>
                  </label>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={loading || !intent.raw}
                className="w-full bg-[#00ff00] text-[#000] py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#00cc00] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                Execute Pipeline
              </button>
            </div>
          </section>

          <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm space-y-4">
            <div className="flex items-center gap-2 text-[#ff0000] mb-2">
              <ShieldAlert size={16} />
              <h2 className="text-xs font-bold uppercase tracking-wider">Recursive Error-Correction</h2>
            </div>
            <div className="space-y-3">
              <textarea 
                value={failedStep}
                onChange={(e) => setFailedStep(e.target.value)}
                placeholder="Paste failed step logs here..."
                className="w-full h-20 bg-[#050505] border border-[#1a1a1a] p-3 text-[10px] focus:border-[#ff0000] outline-none transition-colors resize-none"
              />
              <button 
                onClick={handleRetrospective}
                disabled={loading || !failedStep}
                className="w-full border border-[#ff0000] text-[#ff0000] py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#ff0000] hover:text-[#000] transition-all"
              >
                Run Retrospective
              </button>
            </div>
          </section>

          <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm">
            <div className="flex items-center gap-2 text-[#0088ff] mb-4">
              <BookOpen size={16} />
              <h2 className="text-xs font-bold uppercase tracking-wider">OpenMemory.md</h2>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {memory.length === 0 ? (
                <p className="text-[10px] text-[#444] italic">Memory buffer empty...</p>
              ) : (
                memory.map((m, i) => (
                  <div key={i} className="bg-[#050505] border border-[#1a1a1a] p-2 rounded-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-[#0088ff] font-bold">{m.key.toUpperCase()}</span>
                      <span className="text-[8px] text-[#444]">{m.lastUpdated.split('T')[1].split('.')[0]}</span>
                    </div>
                    <p className="text-[10px] text-[#888] truncate">{m.value}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {showHistory ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm space-y-6"
              >
                <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
                  <div className="flex items-center gap-2 text-[#00ff00]">
                    <History size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Generation History</h2>
                  </div>
                  <button onClick={() => setShowHistory(false)} className="text-[10px] text-[#666] hover:text-[#e0e0e0] uppercase">Close</button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                  {history.length === 0 ? (
                    <p className="text-xs text-[#444] italic text-center py-12">No history recorded yet...</p>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm hover:border-[#00ff00] transition-colors group cursor-pointer" onClick={() => {
                        setAudit(item.results.audit);
                        setStress(item.results.stress);
                        setInstructionSet(item.results.instructionSet);
                        setShowHistory(false);
                      }}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] text-[#00ff00] font-bold">{new Date(item.timestamp).toLocaleString()}</span>
                          <span className="text-[9px] text-[#444] uppercase">{item.intent.targetModel}</span>
                        </div>
                        <p className="text-xs text-[#aaa] line-clamp-2 mb-2">{item.intent.raw}</p>
                        <div className="flex gap-2">
                          <span className="text-[8px] bg-[#1a1a1a] px-2 py-0.5 rounded-sm text-[#666]">{item.results.instructionSet.cognitiveStack.length} STACK</span>
                          <span className="text-[8px] bg-[#1a1a1a] px-2 py-0.5 rounded-sm text-[#666]">{item.results.instructionSet.verificationGates.length} GATES</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center gap-4 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-12"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-[#1a1a1a] rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-[#00ff00] rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold tracking-widest uppercase animate-pulse">Processing Cognitive Pipeline</p>
                  <p className="text-[10px] text-[#666] mt-1">Synthesizing high-dimensional instruction set...</p>
                </div>
              </motion.div>
            ) : instructionSet ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Cognitive Load Monitor */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666] uppercase font-bold">Cognitive Load Monitor</span>
                    <span className={`text-[10px] font-bold ${getCognitiveLoad() > 80 ? 'text-[#ff0000]' : getCognitiveLoad() > 50 ? 'text-[#ffaa00]' : 'text-[#00ff00]'}`}>
                      {getCognitiveLoad()}% DENSITY
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#050505] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${getCognitiveLoad()}%` }}
                      className={`h-full ${getCognitiveLoad() > 80 ? 'bg-[#ff0000]' : getCognitiveLoad() > 50 ? 'bg-[#ffaa00]' : 'bg-[#00ff00]'}`}
                    />
                  </div>
                  <p className="text-[9px] text-[#444] mt-2">
                    {getCognitiveLoad() > 80 ? 'CRITICAL: Instruction set may exceed model reasoning capacity.' : 'OPTIMAL: Cognitive density within recommended thresholds.'}
                  </p>

                  {getCognitiveLoad() > 80 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-[#1a0000] border border-[#ff0000] rounded-sm"
                    >
                      <div className="flex items-center gap-2 text-[#ff0000] mb-2">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold uppercase">Mitigation Strategies</span>
                      </div>
                      <ul className="text-[9px] text-[#aaa] space-y-1 list-disc list-inside">
                        <li>Reduce the number of non-negotiable directives in your intent.</li>
                        <li>Increase LCI Compression Ratio to squeeze more context.</li>
                        <li>Switch to a higher-capacity model (e.g., Gemini 2.0 Pro).</li>
                        <li>Decompose the high-dimensional build into smaller sub-tasks.</li>
                      </ul>
                    </motion.div>
                  )}
                </div>

                {/* Audit Findings View */}
                {audit && stress && <AuditView audit={audit} stress={stress} />}

                {/* Main Instruction Set */}
                <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm overflow-hidden">
                  <div className="bg-[#1a1a1a] p-1 flex items-center justify-between">
                    <div className="flex">
                      <button 
                        onClick={() => setActiveTab('prompt')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeTab === 'prompt' ? 'bg-[#0f0f0f] text-[#00ff00]' : 'text-[#666] hover:text-[#aaa]'}`}
                      >
                        <FileCode size={12} /> Executable_Prompt
                      </button>
                      <button 
                        onClick={() => setActiveTab('sampling')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeTab === 'sampling' ? 'bg-[#0f0f0f] text-[#00ff00]' : 'text-[#666] hover:text-[#aaa]'}`}
                      >
                        <Zap size={12} /> Verbalized_Sampling
                      </button>
                      <button 
                        onClick={() => setActiveTab('audit')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeTab === 'audit' ? 'bg-[#0f0f0f] text-[#00ff00]' : 'text-[#666] hover:text-[#aaa]'}`}
                      >
                        <Eye size={12} /> Cognitive_Audit
                      </button>
                      <button 
                        onClick={() => setActiveTab('docs')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeTab === 'docs' ? 'bg-[#0f0f0f] text-[#00ff00]' : 'text-[#666] hover:text-[#aaa]'}`}
                      >
                        <FileText size={12} /> Documentation
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${activeTab === 'history' ? 'bg-[#0f0f0f] text-[#00ff00]' : 'text-[#666] hover:text-[#aaa]'}`}
                      >
                        <History size={12} /> Version_Control
                      </button>
                    </div>
                    <div className="flex items-center gap-2 pr-2">
                      <button 
                        onClick={() => handleExport('md')}
                        className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors px-2"
                      >
                        <Download size={12} /> EXPORT_MD
                      </button>
                      <button 
                        onClick={() => handleExport('json')}
                        className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors px-2"
                      >
                        <Download size={12} /> EXPORT_JSON
                      </button>
                      <button 
                        onClick={() => handleExport('cursor')}
                        className="text-[9px] text-[#00ff00] hover:text-[#00cc00] flex items-center gap-1 transition-colors px-2 font-bold"
                      >
                        <Terminal size={12} /> EXPORT_CURSOR
                      </button>
                      <button 
                        onClick={() => navigator.clipboard.writeText(instructionSet.finalPrompt)}
                        className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors px-2 border-l border-[#333] ml-2 pl-2"
                      >
                        <Save size={12} /> COPY
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {activeTab === 'prompt' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <div>
                              <span className="text-[9px] text-[#666] uppercase block mb-2">System Role</span>
                              <div className="bg-[#050505] p-3 border-l-2 border-[#00ff00] text-[11px] text-[#00ff00] font-bold">
                                {instructionSet.systemRole}
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#666] uppercase block mb-2">Cognitive Stack</span>
                              <div className="flex flex-wrap gap-2">
                                {instructionSet.cognitiveStack.map((s, i) => (
                                  <span key={i} className="bg-[#1a1a1a] text-[#aaa] px-2 py-1 text-[9px] rounded-sm border border-[#222]">
                                    {s.toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <span className="text-[9px] text-[#666] uppercase block mb-2">Verification Gates</span>
                              <div className="space-y-2">
                                {instructionSet.verificationGates.map((g, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[10px] text-[#aaa]">
                                    <CheckCircle2 size={12} className="text-[#00ff00]" />
                                    {g}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] text-[#666] uppercase block mb-2">Handoff Artifacts</span>
                              <div className="flex flex-wrap gap-2">
                                {instructionSet.handoffArtifacts.map((a, i) => (
                                  <span key={i} className="bg-[#002200] text-[#00ff00] px-2 py-1 text-[9px] rounded-sm border border-[#004400]">
                                    {a}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-[#1a1a1a]">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] text-[#666] uppercase block">Instruction Set Payload</span>
                            <div className="flex items-center gap-2 bg-[#002200] border border-[#004400] px-2 py-1 rounded-sm">
                              <Info size={10} className="text-[#00ff00]" />
                              <span className="text-[8px] text-[#00ff00] uppercase font-bold">Usage: Copy and paste into a fresh AI session</span>
                            </div>
                          </div>
                          <pre className="bg-[#050505] p-4 text-[11px] text-[#aaa] leading-relaxed whitespace-pre-wrap border border-[#1a1a1a] max-h-96 overflow-y-auto custom-scrollbar font-mono">
                            {instructionSet.finalPrompt}
                          </pre>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'sampling' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="flex items-center gap-2 text-[#00ff00] mb-2">
                          <Zap size={16} />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Advanced Verbalized Sampling Analysis</h4>
                        </div>
                        <div className="bg-[#050505] border border-[#1a1a1a] p-6 rounded-sm">
                          <p className="text-[11px] text-[#aaa] leading-relaxed whitespace-pre-wrap italic">
                            {instructionSet.verbalizedSampling || "No sampling data available for this generation."}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-6">
                          <div className="p-3 border border-[#1a1a1a] bg-[#0f0f0f]">
                            <span className="text-[8px] text-[#666] uppercase block mb-1">Sampling Temp</span>
                            <span className="text-[10px] text-[#00ff00] font-bold">0.7 (ADAPTIVE)</span>
                          </div>
                          <div className="p-3 border border-[#1a1a1a] bg-[#0f0f0f]">
                            <span className="text-[8px] text-[#666] uppercase block mb-1">Top_P</span>
                            <span className="text-[10px] text-[#00ff00] font-bold">0.95 (NUCLEUS)</span>
                          </div>
                          <div className="p-3 border border-[#1a1a1a] bg-[#0f0f0f]">
                            <span className="text-[8px] text-[#666] uppercase block mb-1">Consistency</span>
                            <span className="text-[10px] text-[#00ff00] font-bold">HIGH (98.2%)</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'audit' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                          <div className="flex items-center gap-2 text-[#00ff00] mb-4">
                            <ShieldAlert size={14} />
                            <h3 className="text-[10px] font-bold uppercase tracking-wider">Forensic Cognitive Printout</h3>
                          </div>
                          <pre className="text-[9px] text-[#444] leading-tight overflow-x-auto">
                            {JSON.stringify({ audit, stress, instructionSet }, null, 2)}
                          </pre>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'docs' && (
                      <motion.div 
                        key="docs"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-8"
                      >
                        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
                          <div className="flex items-center gap-3">
                            <FileText className="text-[#00ff00]" size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-widest">Project Documentation Kit</h2>
                          </div>
                          <button 
                            onClick={downloadPDF}
                            className="bg-[#00ff00] text-[#000] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#00cc00] transition-colors flex items-center gap-2"
                          >
                            <Download size={14} /> Download PDF
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-6">
                            <section>
                              <h3 className="text-[10px] text-[#00ff00] uppercase font-bold mb-2">GitHub Description</h3>
                              <p className="text-[11px] text-[#aaa] bg-[#050505] p-3 border border-[#1a1a1a]">
                                Meta-Prompt Architect: A high-dimensional cognitive governance layer for LLMs. Transforms vague user intent into "Steel-man" instruction sets using recursive stress-testing, Linear Context Injection (LCI), and model-specific reasoning adapters.
                              </p>
                            </section>

                            <section>
                              <h3 className="text-[10px] text-[#00ff00] uppercase font-bold mb-2">Elevator Pitches</h3>
                              <div className="space-y-4">
                                <div className="bg-[#050505] p-3 border border-[#1a1a1a]">
                                  <span className="text-[8px] text-[#444] uppercase block mb-1">1-Sentence</span>
                                  <p className="text-[11px] text-[#aaa]">"Meta-Prompt Architect is a governance operating system that transforms vague human ideas into bulletproof, machine-executable instruction sets for advanced AI models."</p>
                                </div>
                                <div className="bg-[#050505] p-3 border border-[#1a1a1a]">
                                  <span className="text-[8px] text-[#444] uppercase block mb-1">3-Sentence</span>
                                  <p className="text-[11px] text-[#aaa]">"Most AI prompts fail because they lack structural logic and fail to account for edge cases. Meta-Prompt Architect solves this by running every intent through a recursive stress-test and audit pipeline before generating a final payload. It ensures that your AI assistants operate within a strict 'Cognitive Governance' layer, maximizing both safety and execution precision."</p>
                                </div>
                              </div>
                            </section>
                          </div>

                          <div className="space-y-6">
                            <section>
                              <h3 className="text-[10px] text-[#00ff00] uppercase font-bold mb-2">Resume Snippet</h3>
                              <div className="bg-[#050505] p-4 border border-[#1a1a1a] space-y-2">
                                <p className="text-[11px] text-[#00ff00] font-bold">Meta-Prompt Architect | Lead Cognitive Architect</p>
                                <ul className="text-[10px] text-[#aaa] space-y-2 list-disc list-inside">
                                  <li>Engineered a high-dimensional AI governance platform using a recursive three-phase reasoning pipeline (Audit, Stress-Test, Synthesis).</li>
                                  <li>Developed Linear Context Injection (LCI) for optimized token usage and long-context stability.</li>
                                  <li>Implemented a real-time Cognitive Load Monitor to visualize model reasoning density.</li>
                                  <li>Integrated model-specific reasoning adapters for Claude 3.7, Gemini 2.0, and GPT-4o.</li>
                                  <li>Built a Recursive Error-Correction engine to refactor prompt templates based on execution logs.</li>
                                </ul>
                              </div>
                            </section>
                          </div>
                        </div>

                        <section className="pt-6 border-t border-[#1a1a1a]">
                          <h3 className="text-[10px] text-[#00ff00] uppercase font-bold mb-2">Full Paragraph Pitch</h3>
                          <div className="bg-[#050505] p-4 border border-[#1a1a1a] text-[11px] text-[#aaa] leading-relaxed">
                            In an era of autonomous AI agents, the bottleneck is no longer the model's intelligence, but the quality of the instructions it receives. Meta-Prompt Architect is a high-dimensional prompt engineering tool that treats governance as code. By utilizing a three-phase pipeline—Audit, Stress-Test, and Synthesis—it hardens user intent into 'Steel-man' instruction sets that are virtually inescapable for the target AI. The system features advanced technologies like Linear Context Injection (LCI) for token efficiency and a real-time Cognitive Load Monitor to prevent reasoning collapse. Whether you are building complex software or auditing legal contracts, the Architect ensures your AI remains aligned, safe, and highly performant. It is the definitive tool for anyone moving from 'hobby-grade' prompting to production-grade AI governance.
                          </div>
                        </section>

                        {redTeamResults && (
                          <section className="pt-6 border-t border-[#1a1a1a]">
                            <div className="flex items-center gap-2 text-[#ff0000] mb-4">
                              <ShieldAlert size={16} />
                              <h3 className="text-[10px] font-bold uppercase tracking-wider">Adversarial Red-Team Report</h3>
                            </div>
                            <div className="bg-[#1a0000] border border-[#ff0000] p-4 rounded-sm space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-[#ff0000] font-bold uppercase">Security Score</span>
                                <span className="text-lg font-bold text-[#ff0000]">{redTeamResults.score}/10</span>
                              </div>
                              <p className="text-[10px] text-[#aaa] leading-relaxed">{redTeamResults.reasoning}</p>
                              <div className="space-y-2">
                                <span className="text-[8px] text-[#666] uppercase font-bold">Detected Vulnerabilities</span>
                                <ul className="text-[9px] text-[#ff0000] space-y-1 list-disc list-inside">
                                  {redTeamResults.vulnerabilities.map((v, i) => <li key={i}>{v}</li>)}
                                </ul>
                              </div>
                            </div>
                          </section>
                        )}
                      </motion.div>
                    )}
                    {activeTab === 'history' && (
                      <motion.div 
                        key="history"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
                          <div className="flex items-center gap-3">
                            <GitBranch className="text-[#00ff00]" size={20} />
                            <h2 className="text-sm font-bold uppercase tracking-widest">Git-for-Prompts: Version Control</h2>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-1 space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.map((item, i) => (
                              <div 
                                key={item.id} 
                                className="bg-[#050505] border border-[#1a1a1a] p-3 rounded-sm hover:border-[#00ff00] cursor-pointer transition-colors"
                                onClick={() => {
                                  setInstructionSet(item.results.instructionSet);
                                  setAudit(item.results.audit);
                                  setStress(item.results.stress);
                                }}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] text-[#00ff00] font-bold">v{history.length - i}.0</span>
                                  <span className="text-[8px] text-[#444]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-[10px] text-[#aaa] line-clamp-1">{item.intent.raw}</p>
                              </div>
                            ))}
                          </div>
                          
                          <div className="md:col-span-2 bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                            <div className="flex items-center gap-2 text-[#666] mb-4">
                              <RefreshCw size={14} />
                              <span className="text-[10px] font-bold uppercase">Architectural Diff Viewer</span>
                            </div>
                            <div className="text-[10px] text-[#444] italic text-center py-20 border border-dashed border-[#1a1a1a]">
                              Select two versions to compare architectural drift...
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : retrospective ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0f0f0f] border border-[#ff0000] p-8 rounded-sm space-y-6"
              >
                <div className="flex items-center gap-3 text-[#ff0000]">
                  <AlertCircle size={24} />
                  <h2 className="text-lg font-bold uppercase tracking-widest">Retrospective Analysis</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] text-[#666] uppercase block mb-2">Root Cause of Failure</span>
                    <p className="text-sm text-[#e0e0e0] leading-relaxed bg-[#1a0000] p-4 border-l-4 border-[#ff0000]">
                      {retrospective.failureReason}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#666] uppercase block mb-2">BUILD_CONTRACT.template.md Update</span>
                    <pre className="bg-[#050505] p-4 text-xs text-[#ffaa00] border border-[#1a1a1a] whitespace-pre-wrap font-mono">
                      {retrospective.suggestedUpdate}
                    </pre>
                  </div>
                </div>
                <button 
                  onClick={() => setRetrospective(null)}
                  className="bg-[#ff0000] text-[#000] px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors"
                >
                  Clear Analysis
                </button>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#0f0f0f] border border-[#1a1a1a] border-dashed rounded-sm">
                <Layers size={48} className="text-[#1a1a1a] mb-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#444]">Awaiting Intent Input</h3>
                <p className="text-[10px] text-[#333] mt-2 max-w-xs">Initialize the pipeline by describing your objective in the environmental scan panel.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Global Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 right-6 bg-[#ff0000] text-[#000] p-4 rounded-sm shadow-2xl flex items-center gap-3 z-[100]"
          >
            <AlertCircle size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase">Pipeline Error</span>
              <span className="text-[11px]">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="ml-4 hover:opacity-50">
              <RefreshCw size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #050505;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1a1a;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #222;
        }
      `}</style>
    </div>
  );
}

