import React from 'react';
import { AuditResult, StressTestResult } from '../types';
import { Shield, Cpu, Layers, AlertTriangle, Copy, FileJson, FileText } from 'lucide-react';

interface AuditViewProps {
  audit: AuditResult;
  stress: StressTestResult;
}

export default function AuditView({ audit, stress }: AuditViewProps) {
  const handleExport = (title: string, data: any, format: 'json' | 'md') => {
    let content = '';
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
    } else {
      content = `# ${title}\n\n`;
      if (Array.isArray(data)) {
        data.forEach(item => content += `- ${item}\n`);
      } else if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          content += `## ${key}\n`;
          if (Array.isArray(value)) {
            value.forEach(item => content += `- ${item}\n`);
          } else {
            content += `${value}\n`;
          }
          content += '\n';
        });
      }
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${format}`;
    a.click();
  };

  const handleCopy = (data: any) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(content);
  };

  const ExportActions = ({ title, data }: { title: string, data: any }) => (
    <div className="flex items-center gap-2 ml-auto">
      <button onClick={() => handleCopy(data)} className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors" title="Copy to clipboard">
        <Copy size={12} /> COPY
      </button>
      <button onClick={() => handleExport(title, data, 'json')} className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors" title="Download JSON">
        <FileJson size={12} /> JSON
      </button>
      <button onClick={() => handleExport(title, data, 'md')} className="text-[9px] text-[#666] hover:text-[#00ff00] flex items-center gap-1 transition-colors" title="Download Markdown">
        <FileText size={12} /> MD
      </button>
    </div>
  );

  return (
    <div className="space-y-8" role="region" aria-label="Cognitive Audit Findings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environmental Scan Results */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm space-y-6 relative group">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-3">
            <div className="flex items-center gap-2 text-[#00ff00]">
              <Layers size={18} aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Environmental Scan</h3>
            </div>
            <ExportActions title="Environmental Scan" data={{ assumptions: audit.assumptions, edgeCases: audit.edgeCases }} />
          </div>
          
          <div className="space-y-4">
            <div aria-labelledby="assumptions-title">
              <h4 id="assumptions-title" className="text-[10px] text-[#666] uppercase font-bold mb-2">Implicit Assumptions</h4>
              <ul className="space-y-2">
                {audit.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-[#aaa] flex gap-2">
                    <span className="text-[#00ff00]" aria-hidden="true">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div aria-labelledby="edge-cases-title">
              <h4 id="edge-cases-title" className="text-[10px] text-[#666] uppercase font-bold mb-2">Critical Edge Cases</h4>
              <ul className="space-y-2">
                {audit.edgeCases.map((e, i) => (
                  <li key={i} className="text-[11px] text-[#aaa] flex gap-2">
                    <AlertTriangle size={12} className="text-[#ffaa00] shrink-0 mt-0.5" aria-hidden="true" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Stress Test Results */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm space-y-6 relative group">
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-3">
            <div className="flex items-center gap-2 text-[#ffaa00]">
              <Cpu size={18} aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Stress Test Analysis</h3>
            </div>
            <ExportActions title="Stress Test Analysis" data={{ criticArgument: stress.criticArgument, logicOptimization: stress.logicOptimization }} />
          </div>

          <div className="space-y-4">
            <div aria-labelledby="critic-title">
              <h4 id="critic-title" className="text-[10px] text-[#666] uppercase font-bold mb-2">Critic Persona Argument</h4>
              <blockquote className="text-[11px] text-[#aaa] italic leading-relaxed bg-[#050505] p-3 border-l-2 border-[#ffaa00]">
                "{stress.criticArgument}"
              </blockquote>
            </div>

            <div aria-labelledby="optimization-title">
              <h4 id="optimization-title" className="text-[10px] text-[#666] uppercase font-bold mb-2">Logic Optimization</h4>
              <p className="text-[11px] text-[#aaa] leading-relaxed">
                {stress.logicOptimization}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Truth Surface */}
      <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm relative group">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-3 mb-4">
          <div className="flex items-center gap-2 text-[#0088ff]">
            <Shield size={18} aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Truth Surface (Required Data)</h3>
          </div>
          <ExportActions title="Truth Surface" data={audit.truthSurface} />
        </div>
        <div className="flex flex-wrap gap-2">
          {audit.truthSurface.map((t, i) => (
            <span key={i} className="bg-[#050505] border border-[#1a1a1a] text-[#0088ff] px-3 py-1 text-[10px] rounded-sm">
              {t.toUpperCase()}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
