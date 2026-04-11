import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';
import { AlertTriangle } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="p-6 bg-[#1a0505] border border-[#ff0000] rounded-sm m-4 text-[#ff0000]">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={24} />
        <h2 className="text-lg font-bold uppercase tracking-widest">System Failure</h2>
      </div>
      <p className="text-sm mb-4">The Meta-Prompt Architect encountered an unexpected error.</p>
      <pre className="text-xs bg-[#050505] p-4 overflow-auto border border-[#ff0000] opacity-80">
        {error.message}
      </pre>
      <button 
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-[#ff0000] text-white text-xs font-bold uppercase hover:bg-[#cc0000] transition-colors"
      >
        Reboot System
      </button>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: Props) {
  return (
    <ReactErrorBoundary 
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      {children}
    </ReactErrorBoundary>
  );
}
