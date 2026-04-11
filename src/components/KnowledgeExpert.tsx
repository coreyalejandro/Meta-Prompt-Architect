import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, User, Bot } from 'lucide-react';
import { chatWithExpert } from '../services/gemini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface KnowledgeExpertProps {
  context: any;
}

export default function KnowledgeExpert({ context }: KnowledgeExpertProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Greetings. I am your Meta-Prompt Knowledge Expert. How can I assist your cognitive governance journey today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const response = await chatWithExpert(userMsg, context, signal);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      if (error instanceof Error && error.message === 'AbortError') {
        return;
      }
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered a cognitive disruption. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#0f0f0f] border border-[#1a1a1a] w-80 h-[450px] rounded-sm shadow-2xl flex flex-col mb-4 overflow-hidden"
          >
            <div className="bg-[#1a1a1a] p-3 flex items-center justify-between border-b border-[#333]">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#00ff00]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#e0e0e0]">Knowledge Expert</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-[#666] hover:text-[#fff]">
                <X size={14} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#050505]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#00ff00] text-[#000]' : 'bg-[#1a1a1a] text-[#00ff00] border border-[#333]'}`}>
                    {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                  </div>
                  <div className={`p-3 text-[10px] leading-relaxed rounded-sm ${msg.role === 'user' ? 'bg-[#1a1a1a] text-[#e0e0e0]' : 'bg-[#0f0f0f] text-[#aaa] border border-[#1a1a1a]'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#1a1a1a] text-[#00ff00] border border-[#333] flex items-center justify-center">
                    <Bot size={12} />
                  </div>
                  <div className="p-3 bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-[#00ff00] rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-[#00ff00] rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1 h-1 bg-[#00ff00] rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#1a1a1a] border-t border-[#333]">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask the expert..."
                  className="w-full bg-[#050505] border border-[#333] p-2 pr-10 text-[10px] text-[#e0e0e0] outline-none focus:border-[#00ff00] transition-colors rounded-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#00ff00] disabled:text-[#333] transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-[#00ff00] text-[#000] rounded-full shadow-2xl flex items-center justify-center hover:bg-[#00cc00] transition-colors"
      >
        <MessageSquare size={20} />
      </motion.button>
    </div>
  );
}
