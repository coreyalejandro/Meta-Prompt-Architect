import React from 'react';
import { AuditResult, StressTestResult } from '../types';
import { Shield, Cpu, Layers, AlertTriangle } from 'lucide-react';

interface AuditViewProps {
  audit: AuditResult;
  stress: StressTestResult;
}

export default function AuditView({ audit, stress }: AuditViewProps) {
  return (
    <div className="space-y-8" role="region" aria-label="Cognitive Audit Findings">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environmental Scan Results */}
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm space-y-6">
          <div className="flex items-center gap-2 text-[#00ff00] border-b border-[#1a1a1a] pb-3">
            <Layers size={18} aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Environmental Scan</h3>
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
        <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm space-y-6">
          <div className="flex items-center gap-2 text-[#ffaa00] border-b border-[#1a1a1a] pb-3">
            <Cpu size={18} aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Stress Test Analysis</h3>
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
      <section className="bg-[#0f0f0f] border border-[#1a1a1a] p-6 rounded-sm">
        <div className="flex items-center gap-2 text-[#0088ff] border-b border-[#1a1a1a] pb-3 mb-4">
          <Shield size={18} aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-widest">Truth Surface (Required Data)</h3>
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
