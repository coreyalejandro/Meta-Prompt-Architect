import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Target, Zap, Shield, Layers, Cpu, Terminal, CheckCircle2, Info, HelpCircle, X } from 'lucide-react';

interface ManualProps {
  isOpen: boolean;
  onClose: () => void;
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex items-center" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      {children}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-0 mb-2 w-48 bg-[#1a1a1a] border border-[#333] p-2 rounded-sm shadow-xl z-[110] pointer-events-none"
          >
            <p className="text-[9px] text-[#aaa] leading-tight">{text}</p>
            <div className="absolute top-full left-2 w-2 h-2 bg-[#1a1a1a] border-r border-b border-[#333] rotate-45 -mt-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Manual({ isOpen, onClose }: ManualProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#000]/90 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#0f0f0f] border border-[#1a1a1a] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-sm shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-[#1a1a1a] p-4 flex items-center justify-between bg-[#050505]">
          <div className="flex items-center gap-3">
            <Book className="text-[#00ff00]" size={20} />
            <h2 className="text-sm font-bold uppercase tracking-widest">Operator's Manual: Meta-Prompt Architect</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#666] hover:text-[#e0e0e0] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar selection:bg-[#00ff00] selection:text-[#000]">
          
          {/* Section 1: The Core Concept */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#00ff00]">
              <Target size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider">01. The Core Concept (The "Why")</h3>
            </div>
            <p className="text-sm text-[#aaa] leading-relaxed">
              Standard AI prompts often fail because they are too vague. This tool acts as a <span className="text-[#e0e0e0] font-bold">Cognitive Governance Layer</span>. 
              It takes your raw idea and transforms it into a high-dimensional instruction set that "survives" the complexity of modern LLMs.
            </p>
            <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm border-l-2 border-l-[#00ff00]">
              <p className="text-[11px] text-[#888] italic">
                "Think of it like an architect's blueprint. You don't just tell a builder 'make a house'; you give them precise measurements, material lists, and structural constraints."
              </p>
            </div>
          </section>

          {/* Section 2: The Pipeline Steps */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-[#00ff00]">
              <Layers size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider">02. The Pipeline (The "How")</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#00ff00]">
                  <Terminal size={14} />
                  <span className="text-[10px] font-bold uppercase">Environmental Scan</span>
                </div>
                <p className="text-[10px] text-[#666]">
                  The system scans your intent for hidden assumptions and edge cases. It finds the "Truth Surface"—the facts the AI needs to know.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#ffaa00]">
                  <Cpu size={14} />
                  <span className="text-[10px] font-bold uppercase">Stress Test</span>
                </div>
                <p className="text-[10px] text-[#666]">
                  A "Critic" persona tries to break the prompt. We resolve these tensions into a "Steel-man" version that is much harder to confuse.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#0088ff]">
                  <Zap size={14} />
                  <span className="text-[10px] font-bold uppercase">Instruction Synthesis</span>
                </div>
                <p className="text-[10px] text-[#666]">
                  The final prompt is built using <span className="text-[#00ff00]">Verbalized Sampling</span>, choosing the best architecture (CoT, Few-Shot, etc.) for your specific goal.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Advanced Controls */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[#00ff00]">
              <Zap size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider">03. Advanced Controls (Mastery)</h3>
            </div>
            <div className="space-y-6">
              <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                <h4 className="text-[10px] font-bold text-[#e0e0e0] uppercase mb-2">LCI (Token Squeezing)</h4>
                <p className="text-[11px] text-[#aaa] mb-3">
                  Use this for long-running tasks. It compresses the context so the AI doesn't "forget" earlier instructions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#0f0f0f] border border-[#1a1a1a]">
                    <span className="text-[9px] text-[#00ff00] uppercase block font-bold mb-1">Context Window</span>
                    <p className="text-[10px] text-[#666]">Sets the "memory buffer" size. For complex apps, use 128k+. For massive builds, push to 1M.</p>
                  </div>
                  <div className="p-3 bg-[#0f0f0f] border border-[#1a1a1a]">
                    <span className="text-[9px] text-[#00ff00] uppercase block font-bold mb-1">Compression Ratio</span>
                    <p className="text-[10px] text-[#666]">1:1 is raw data. 20:1 is highly abstract. Higher ratios save tokens but may lose nuance.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                <h4 className="text-[10px] font-bold text-[#e0e0e0] uppercase mb-2">Verbalized Sampling</h4>
                <p className="text-[11px] text-[#aaa] mb-3">
                  This is the "internal monologue" of the AI. It evaluates multiple prompt architectures before picking the winner.
                </p>
                <div className="flex items-center gap-4 text-[10px] text-[#666]">
                  <div className="flex items-center gap-1">
                    <Tooltip text="Chain-of-Thought (CoT) encourages the model to reason step-by-step, improving accuracy for complex logic.">
                      <Info size={12} className="cursor-help" />
                    </Tooltip>
                    CoT
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip text="Few-Shot provides the model with specific examples of the desired output format to set a clear pattern.">
                      <Info size={12} className="cursor-help" />
                    </Tooltip>
                    Few-Shot
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip text="Role-Based framing assigns a specific expert persona to the model to influence its tone and depth.">
                      <Info size={12} className="cursor-help" />
                    </Tooltip>
                    Role-Based
                  </div>
                </div>
              </div>

              <div className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm">
                <h4 className="text-[10px] font-bold text-[#e0e0e0] uppercase mb-2">Error Correction</h4>
                <p className="text-[11px] text-[#aaa]">
                  If a prompt fails, paste the error log into the <span className="text-[#ff0000]">Retrospective</span> panel. The system will perform a forensic audit to fix the underlying "Contract".
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Inclusion & Feedback */}
          <section className="bg-[#001100] border border-[#004400] p-6 rounded-sm space-y-4">
            <div className="flex items-center gap-2 text-[#00ff00]">
              <HelpCircle size={18} />
              <h3 className="text-xs font-bold uppercase tracking-wider">Inclusion & Feedback</h3>
            </div>
            <div className="space-y-4">
              <p className="text-[11px] text-[#aaa] leading-relaxed">
                We believe in an <span className="text-[#e0e0e0] font-bold">all-inclusive design</span>. Neurodiversity is a core strength of the cognitive landscape, and this system is built to be accessible and powerful for every mind.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <CheckCircle2 size={14} className="text-[#00ff00] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#aaa]">
                    <span className="text-[#e0e0e0] font-bold">Deep-Dive Analysis:</span> Use the "Cognitive Audit" tab to inspect raw system data for full transparency into the generation process.
                  </p>
                </li>
              </ul>
              <div className="pt-2 border-t border-[#004400]">
                <p className="text-[10px] text-[#666] uppercase mb-2">Have feedback?</p>
                <p className="text-[11px] text-[#aaa]">
                  Your insights help us evolve. Please share your thoughts on how we can improve the cognitive experience via the system console.
                </p>
              </div>
            </div>
          </section>

          <footer className="pt-8 text-center">
            <button 
              onClick={onClose}
              className="bg-[#00ff00] text-[#000] px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#00cc00] transition-all"
            >
              Acknowledge & Begin
            </button>
          </footer>
        </div>
      </motion.div>
    </motion.div>
  );
}
