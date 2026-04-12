import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WorkflowStep, ModelType, UserIntent, ThemeType } from '../types';
import { auditIntent, stressTest, generateInstructionSet, generateWorkflow } from '../services/gemini';
import { Play, Plus, Trash2, GitMerge, CheckCircle2, AlertCircle, RefreshCw, Wand2, LayoutTemplate } from 'lucide-react';

const TEMPLATES = [
  {
    name: "SaaS MVP",
    description: "Full-stack SaaS application with auth, database, and billing.",
    steps: [
      { name: "Database Schema", intent: "Design the PostgreSQL database schema for a multi-tenant SaaS application.", targetModel: ModelType.GPT_5_PRO },
      { name: "Backend API", intent: "Create the Node.js/Express REST API based on the database schema.", targetModel: ModelType.CLAUDE_SONNET_4_6, dependsOnNames: ["Database Schema"] },
      { name: "Frontend UI", intent: "Build the React frontend dashboard connecting to the Backend API.", targetModel: ModelType.GEMINI_3_1_PRO, dependsOnNames: ["Backend API"] }
    ]
  },
  {
    name: "Content Pipeline",
    description: "Automated content generation and review pipeline.",
    steps: [
      { name: "Topic Ideation", intent: "Generate 5 trending topics in the AI space.", targetModel: ModelType.GEMINI_3_1_FLASH },
      { name: "Draft Generation", intent: "Write a comprehensive 1500-word article for each topic.", targetModel: ModelType.CLAUDE_OPUS_4_6, dependsOnNames: ["Topic Ideation"] },
      { name: "SEO Review", intent: "Review the drafts for SEO optimization and readability.", targetModel: ModelType.GPT_5_PRO, dependsOnNames: ["Draft Generation"] }
    ]
  },
  {
    name: "Data Analysis",
    description: "Data extraction, transformation, and visualization.",
    steps: [
      { name: "Data Extraction", intent: "Write a Python script to scrape data from a target website.", targetModel: ModelType.CLAUDE_HAIKU_4_5 },
      { name: "Data Cleaning", intent: "Write a Pandas script to clean and normalize the extracted data.", targetModel: ModelType.CLAUDE_SONNET_4_6, dependsOnNames: ["Data Extraction"] },
      { name: "Visualization", intent: "Create a Streamlit dashboard to visualize the cleaned data.", targetModel: ModelType.GEMINI_3_1_PRO, dependsOnNames: ["Data Cleaning"] }
    ]
  }
];

export default function WorkflowBuilder() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState('');
  const [showAutoBuilder, setShowAutoBuilder] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleAutoGenerate = async () => {
    if (!autoPrompt) return;
    setIsGenerating(true);
    try {
      const result = await generateWorkflow(autoPrompt);
      const newSteps: WorkflowStep[] = result.steps.map((s, i) => ({
        id: `step-${Date.now()}-${i}`,
        name: s.name,
        intent: s.intent,
        targetModel: s.targetModel,
        dependsOn: [], // We'll link these in the next pass
        status: 'idle'
      }));

      // Link dependencies
      result.steps.forEach((s, i) => {
        if (s.dependsOnNames && s.dependsOnNames.length > 0) {
          const depIds = s.dependsOnNames.map(depName => {
            const found = newSteps.find(ns => ns.name === depName);
            return found ? found.id : null;
          }).filter(Boolean) as string[];
          newSteps[i].dependsOn = depIds;
        }
      });

      setSteps(newSteps);
      setShowAutoBuilder(false);
      setAutoPrompt('');
    } catch (e) {
      console.error("Failed to auto-generate workflow", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    const newSteps: WorkflowStep[] = template.steps.map((s, i) => ({
      id: `step-${Date.now()}-${i}`,
      name: s.name,
      intent: s.intent,
      targetModel: s.targetModel,
      dependsOn: [],
      status: 'idle'
    }));

    template.steps.forEach((s, i) => {
      if (s.dependsOnNames && s.dependsOnNames.length > 0) {
        const depIds = s.dependsOnNames.map(depName => {
          const found = newSteps.find(ns => ns.name === depName);
          return found ? found.id : null;
        }).filter(Boolean) as string[];
        newSteps[i].dependsOn = depIds;
      }
    });

    setSteps(newSteps);
    setShowTemplates(false);
  };

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      intent: '',
      targetModel: ModelType.GPT_5_PRO,
      dependsOn: [],
      status: 'idle'
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map(s => ({
      ...s,
      dependsOn: s.dependsOn.filter(depId => depId !== id)
    })));
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const executeWorkflow = async () => {
    setIsRunning(true);
    
    // Reset status
    let currentSteps = steps.map(s => ({ ...s, status: 'idle' as const, result: undefined, error: undefined }));
    setSteps(currentSteps);

    const completed = new Set<string>();
    const failed = new Set<string>();

    let hasPending = true;
    while (hasPending) {
      const pendingSteps = currentSteps.filter(s => 
        s.status === 'idle' && 
        s.dependsOn.every(dep => completed.has(dep))
      );

      if (pendingSteps.length === 0) {
        const stuckSteps = currentSteps.filter(s => s.status === 'idle');
        if (stuckSteps.length > 0) {
          currentSteps = currentSteps.map(s => s.status === 'idle' ? { ...s, status: 'failed', error: 'Dependency failed or circular dependency' } : s);
          setSteps(currentSteps);
        }
        break;
      }

      // Run pending steps
      await Promise.all(pendingSteps.map(async (step) => {
        currentSteps = currentSteps.map(s => s.id === step.id ? { ...s, status: 'running' } : s);
        setSteps(currentSteps);

        try {
          let fullIntentRaw = step.intent;
          if (step.dependsOn.length > 0) {
             const depResults = step.dependsOn.map(depId => {
               const depStep = currentSteps.find(s => s.id === depId);
               return `\n\n--- Output from ${depStep?.name} ---\n${depStep?.result?.finalPrompt}`;
             }).join('\n');
             fullIntentRaw += `\n\nContext from previous steps:${depResults}`;
          }

          const intentObj: UserIntent = {
            raw: fullIntentRaw,
            targetModel: step.targetModel,
            useLCI: true,
            lciConfig: { contextWindow: 128000, compressionRatio: 4 },
            highRisk: false,
            theme: ThemeType.DARK
          };

          const auditRes = await auditIntent(intentObj);
          const stressRes = await stressTest(intentObj, auditRes);
          const instructionRes = await generateInstructionSet(intentObj, stressRes, []);

          currentSteps = currentSteps.map(s => s.id === step.id ? { ...s, status: 'completed', result: instructionRes } : s);
          setSteps(currentSteps);
          completed.add(step.id);
        } catch (err) {
          currentSteps = currentSteps.map(s => s.id === step.id ? { ...s, status: 'failed', error: String(err) } : s);
          setSteps(currentSteps);
          failed.add(step.id);
        }
      }));
    }

    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm gap-4">
        <div className="flex items-center gap-3 text-[#0088ff]">
          <GitMerge size={24} className="flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest">Workflow Builder</h2>
            <p className="text-[10px] text-[#666]">Chain prompts and define dependencies for complex generation pipelines.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowTemplates(true)}
            disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a1a] text-[#e0e0e0] text-xs font-bold uppercase hover:bg-[#222] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <LayoutTemplate size={14} /> Templates
          </button>
          <button 
            onClick={() => setShowAutoBuilder(true)}
            disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a1a] text-[#e0e0e0] text-xs font-bold uppercase hover:bg-[#222] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Wand2 size={14} /> Auto-Generate
          </button>
          <button 
            onClick={addStep}
            disabled={isRunning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#1a1a1a] text-[#e0e0e0] text-xs font-bold uppercase hover:bg-[#222] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Plus size={14} /> Add Step
          </button>
          <button 
            onClick={executeWorkflow}
            disabled={isRunning || steps.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[#0088ff] text-[#000] text-xs font-bold uppercase hover:bg-[#0066cc] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {isRunning ? 'Executing...' : 'Run Workflow'}
          </button>
        </div>
      </div>

      {showAutoBuilder && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f0f0f] border border-[#0088ff] p-4 rounded-sm"
        >
          <h3 className="text-xs font-bold text-[#0088ff] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Wand2 size={14} /> Auto-Generate Workflow
          </h3>
          <div className="flex gap-3">
            <input 
              type="text" 
              value={autoPrompt}
              onChange={(e) => setAutoPrompt(e.target.value)}
              placeholder="E.g., Build a complete marketing campaign with blog posts, tweets, and emails..."
              className="flex-1 bg-[#050505] border border-[#1a1a1a] p-2 text-xs text-[#e0e0e0] outline-none focus:border-[#0088ff]"
            />
            <button 
              onClick={handleAutoGenerate}
              disabled={isGenerating || !autoPrompt}
              className="px-4 py-2 bg-[#0088ff] text-[#000] text-xs font-bold uppercase hover:bg-[#0066cc] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : 'Generate'}
            </button>
            <button 
              onClick={() => setShowAutoBuilder(false)}
              className="px-4 py-2 bg-[#1a1a1a] text-[#e0e0e0] text-xs font-bold uppercase hover:bg-[#222] transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {showTemplates && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f0f0f] border border-[#1a1a1a] p-4 rounded-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-widest flex items-center gap-2">
              <LayoutTemplate size={14} /> Template Gallery
            </h3>
            <button 
              onClick={() => setShowTemplates(false)}
              className="text-[#666] hover:text-[#e0e0e0]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATES.map((template, idx) => (
              <div 
                key={idx} 
                className="bg-[#050505] border border-[#1a1a1a] p-4 rounded-sm hover:border-[#0088ff] cursor-pointer transition-colors group"
                onClick={() => loadTemplate(template)}
              >
                <h4 className="text-sm font-bold text-[#0088ff] mb-2">{template.name}</h4>
                <p className="text-[10px] text-[#888] mb-4">{template.description}</p>
                <div className="text-[9px] text-[#444] uppercase flex items-center gap-1 group-hover:text-[#0088ff] transition-colors">
                  <Plus size={10} /> Use Template ({template.steps.length} steps)
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="space-y-4">
        {steps.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#1a1a1a] rounded-sm">
            <GitMerge size={32} className="mx-auto text-[#333] mb-3" />
            <p className="text-xs text-[#666] uppercase tracking-widest">No steps defined</p>
            <p className="text-[10px] text-[#444] mt-1">Add a step to start building your workflow.</p>
          </div>
        ) : (
          steps.map((step, index) => (
            <motion.div 
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-[#050505] border p-4 rounded-sm transition-colors ${
                step.status === 'running' ? 'border-[#0088ff]' : 
                step.status === 'completed' ? 'border-[#00ff00]' : 
                step.status === 'failed' ? 'border-[#ff0000]' : 'border-[#1a1a1a]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#888]">
                    {index + 1}
                  </div>
                  <input 
                    type="text" 
                    value={step.name}
                    onChange={(e) => updateStep(step.id, { name: e.target.value })}
                    className="bg-transparent border-b border-transparent hover:border-[#333] focus:border-[#0088ff] outline-none text-sm font-bold text-[#e0e0e0] px-1 py-0.5"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {step.status === 'running' && <RefreshCw size={14} className="text-[#0088ff] animate-spin" />}
                  {step.status === 'completed' && <CheckCircle2 size={14} className="text-[#00ff00]" />}
                  {step.status === 'failed' && <AlertCircle size={14} className="text-[#ff0000]" />}
                  <button 
                    onClick={() => removeStep(step.id)}
                    disabled={isRunning}
                    className="text-[#666] hover:text-[#ff0000] disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <label className="text-[10px] text-[#666] uppercase block mb-1">Intent / Prompt</label>
                    <textarea 
                      value={step.intent}
                      onChange={(e) => updateStep(step.id, { intent: e.target.value })}
                      disabled={isRunning}
                      className="w-full h-24 bg-[#0f0f0f] border border-[#1a1a1a] p-3 text-xs text-[#e0e0e0] outline-none focus:border-[#0088ff] resize-none disabled:opacity-50"
                      placeholder="Describe what this step should generate..."
                    />
                  </div>
                  {step.result && (
                    <div className="mt-2 p-3 bg-[#0a1a0a] border border-[#00ff00] rounded-sm">
                      <p className="text-[10px] text-[#00ff00] uppercase font-bold mb-1">Generated Output</p>
                      <p className="text-xs text-[#e0e0e0] line-clamp-3">{step.result.finalPrompt}</p>
                    </div>
                  )}
                  {step.error && (
                    <div className="mt-2 p-3 bg-[#1a0505] border border-[#ff0000] rounded-sm text-xs text-[#ff0000]">
                      {step.error}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#666] uppercase block mb-1">Target Model</label>
                    <select 
                      value={step.targetModel}
                      onChange={(e) => updateStep(step.id, { targetModel: e.target.value as ModelType })}
                      disabled={isRunning}
                      className="w-full bg-[#0f0f0f] border border-[#1a1a1a] p-2 text-[10px] outline-none focus:border-[#0088ff] disabled:opacity-50"
                    >
                      {Object.values(ModelType).map(m => (
                        <option key={m} value={m}>{m.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-[10px] text-[#666] uppercase block mb-1">Depends On</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                      {steps.filter(s => s.id !== step.id).length === 0 ? (
                        <p className="text-[10px] text-[#444] italic">No other steps available.</p>
                      ) : (
                        steps.filter(s => s.id !== step.id).map(otherStep => (
                          <label key={otherStep.id} className="flex items-center gap-2 text-[10px] text-[#aaa] cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={step.dependsOn.includes(otherStep.id)}
                              disabled={isRunning}
                              onChange={(e) => {
                                const newDeps = e.target.checked 
                                  ? [...step.dependsOn, otherStep.id]
                                  : step.dependsOn.filter(id => id !== otherStep.id);
                                updateStep(step.id, { dependsOn: newDeps });
                              }}
                              className="accent-[#0088ff]"
                            />
                            {otherStep.name}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
