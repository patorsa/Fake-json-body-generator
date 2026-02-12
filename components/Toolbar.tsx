
import React from 'react';

interface ToolbarProps {
  onFormat: () => void;
  onMinify: () => void;
  onEscape: () => void;
  onUnescape: () => void;
  onCopy: () => void;
  onClear: () => void;
  onGenerateBody: () => void;
  onUndo: () => void;
  isValid: boolean;
  canEscape: boolean;
  canUndo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onFormat, 
  onMinify, 
  onEscape, 
  onUnescape, 
  onCopy, 
  onClear,
  onGenerateBody,
  onUndo,
  isValid,
  canEscape,
  canUndo
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800 border-b border-slate-700">
      <button
        onClick={onFormat}
        disabled={!isValid}
        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
      >
        JSFormat
      </button>
      <button
        onClick={onMinify}
        disabled={!isValid}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
      >
        JSMin
      </button>
      <div className="h-6 w-px bg-slate-600 mx-1" />
      
      <button
        onClick={onGenerateBody}
        title="Envolver JSON actual en un body de respuesta"
        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
        Generar Body
      </button>

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Deshacer último cambio (Ctrl+Z)"
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Deshacer
      </button>

      <div className="h-6 w-px bg-slate-600 mx-1" />
      <button
        onClick={onEscape}
        disabled={!canEscape}
        title={!canEscape ? "El texto ya parece estar escapado" : "Escapar caracteres especiales"}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
      >
        Escape
      </button>
      <button
        onClick={onUnescape}
        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
      >
        Unescape
      </button>
      <div className="flex-grow" />
      <button
        onClick={onCopy}
        className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-sm font-medium transition-colors"
      >
        Copy
      </button>
      <button
        onClick={onClear}
        className="px-3 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded text-sm font-medium transition-colors"
      >
        Clear
      </button>
    </div>
  );
};

export default Toolbar;
