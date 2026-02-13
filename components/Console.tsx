
import React, { useRef, useEffect } from 'react';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface ConsoleProps {
  logs: LogEntry[];
  onClear: () => void;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-48 bg-[#010409] border-t border-slate-800 flex flex-col font-mono text-[12px]">
      <div className="flex justify-between items-center px-4 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Terminal de Salida</span>
        </div>
        <button 
          onClick={onClear}
          className="text-slate-500 hover:text-white transition-colors text-[10px] uppercase font-bold"
        >
          Limpiar
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-grow overflow-auto p-3 space-y-1 scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="text-slate-700 italic">Esperando peticiones...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-1 duration-200">
              <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
              <span className={`shrink-0 font-bold ${
                log.type === 'success' ? 'text-emerald-500' : 
                log.type === 'error' ? 'text-red-500' : 
                log.type === 'warning' ? 'text-amber-500' : 
                'text-sky-500'
              }`}>
                {log.type.toUpperCase()}
              </span>
              <pre className="text-slate-300 whitespace-pre-wrap break-all">{log.message}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Console;
