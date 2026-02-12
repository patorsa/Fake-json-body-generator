
import React, { useState, useEffect, useRef } from 'react';

interface FindReplacePanelProps {
  onFind: (search: string, direction: 'next' | 'prev') => void;
  onReplace: (search: string, replacement: string) => void;
  onReplaceAll: (search: string, replacement: string) => void;
  onClose: () => void;
  findCount: { current: number; total: number };
}

const FindReplacePanel: React.FC<FindReplacePanelProps> = ({ 
  onFind, 
  onReplace, 
  onReplaceAll, 
  onClose,
  findCount 
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    findInputRef.current?.focus();
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleFindNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (findText) onFind(findText, 'next');
  };

  return (
    <div className="absolute top-4 right-6 z-50 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-4 animate-in fade-in zoom-in duration-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Buscar y Reemplazar</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <form onSubmit={handleFindNext} className="space-y-3">
        {/* Buscar */}
        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <label className="text-[10px] text-slate-500 font-semibold uppercase">Buscar</label>
            {findText && (
              <span className="text-[10px] text-indigo-400 font-mono">
                {findCount.total > 0 ? `${findCount.current} de ${findCount.total}` : 'Sin coincidencias'}
              </span>
            )}
          </div>
          <input
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
            placeholder="Texto a buscar..."
          />
        </div>

        {/* Reemplazar */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 font-semibold uppercase">Reemplazar con</label>
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
            placeholder="Nuevo texto..."
          />
        </div>

        {/* Botones Accion */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="submit"
            className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
          >
            Encontrar Próximo
          </button>
          <button
            type="button"
            onClick={() => onReplace(findText, replaceText)}
            className="px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
          >
            Reemplazar
          </button>
          <button
            type="button"
            onClick={() => onReplaceAll(findText, replaceText)}
            className="col-span-2 px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
          >
            Reemplazar Todo
          </button>
        </div>
      </form>
    </div>
  );
};

export default FindReplacePanel;
