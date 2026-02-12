
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  formatJson, 
  minifyJson, 
  escapeJson, 
  unescapeJson, 
  findPathInString,
  canBeEscaped
} from './utils/jsonProcessor';
import Toolbar from './components/Toolbar';
import JsonEditor from './components/JsonEditor';
import JsonTreeView from './components/JsonTreeView';
import FindReplacePanel from './components/FindReplacePanel';

const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ index: number; length: number } | null>(null);
  const [activePath, setActivePath] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Find/Replace state
  const [showSearch, setShowSearch] = useState(false);
  const [searchStats, setSearchStats] = useState({ current: 0, total: 0 });
  const [lastSearch, setLastSearch] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);

  const parsedData = useMemo(() => {
    try {
      if (!jsonText.trim()) return null;
      return JSON.parse(jsonText);
    } catch (e: any) {
      return null;
    }
  }, [jsonText]);

  const canEscapeAction = useMemo(() => {
    return canBeEscaped(jsonText);
  }, [jsonText]);

  const saveToHistory = useCallback((text: string) => {
    setHistory(prev => {
      // Evitar duplicados consecutivos en el historial
      if (prev.length > 0 && prev[prev.length - 1] === text) return prev;
      return [...prev.slice(-19), text]; // Guardar últimos 20 pasos
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setJsonText(lastState);
  }, [history]);

  useEffect(() => {
    if (!jsonText.trim()) {
      setError(null);
      return;
    }
    try {
      JSON.parse(jsonText);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [jsonText]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F para buscar
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
      // Ctrl+Z para deshacer
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (history.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [history, handleUndo]);

  const handleFormat = () => {
    saveToHistory(jsonText);
    const formatted = formatJson(jsonText);
    setJsonText(formatted);
  };

  const handleMinify = () => {
    saveToHistory(jsonText);
    const minified = minifyJson(jsonText);
    setJsonText(minified);
  };

  const handleEscape = () => {
    if (canEscapeAction) {
      saveToHistory(jsonText);
      setJsonText(escapeJson(jsonText));
    }
  };

  const handleUnescape = () => {
    saveToHistory(jsonText);
    setJsonText(unescapeJson(jsonText));
  };

  const handleGenerateBody = () => {
    saveToHistory(jsonText);
    
    let content = jsonText;
    
    try {
      // Intentamos parsear para minificar si es un JSON válido
      const parsed = JSON.parse(jsonText);
      content = JSON.stringify(parsed);
    } catch (e) {
      // Si no es JSON válido (o es un fragmento), verificamos si ya parece estar escapado
      // Si contiene \" y no es un JSON válido, probablemente es una cadena ya escapada
      if (jsonText.includes('\\"')) {
        content = unescapeJson(jsonText);
      }
    }

    const template = {
      "response": {
        "description": "Pedido con Saldo como medio de pago",
        "identifier": "ORDER_DETAILS_2602816000024",
        "message": content,
        "request_id": "orderDetails",
        "type": "MCI"
      }
    };
    
    // Al usar JSON.stringify sobre el objeto template, el campo 'message' 
    // se escapará automáticamente exactamente una vez, generando el formato {\"order\":...}
    const bodyResult = JSON.stringify(template, null, 2);
    setJsonText(bodyResult);
    navigator.clipboard.writeText(bodyResult);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
  };

  const handleClear = () => {
    saveToHistory(jsonText);
    setJsonText('');
    setSelection(null);
    setActivePath('');
  };

  const handleSelectPath = (path: string) => {
    setActivePath(path);
    let currentText = jsonText;
    
    // Auto-format if on a single line to allow navigation
    if (!jsonText.includes('\n') && jsonText.trim().length > 0) {
        saveToHistory(jsonText);
        currentText = formatJson(jsonText);
        setJsonText(currentText);
    }
    
    const found = findPathInString(currentText, path);
    if (found) {
      setSelection(found);
    }
  };

  const clearSelection = useCallback(() => {
    setSelection(null);
  }, []);

  const handleFind = (search: string, direction: 'next' | 'prev') => {
    if (!search) return;
    let matches: number[] = searchMatches;
    if (search !== lastSearch) {
      matches = [];
      let idx = jsonText.toLowerCase().indexOf(search.toLowerCase());
      while (idx !== -1) {
        matches.push(idx);
        idx = jsonText.toLowerCase().indexOf(search.toLowerCase(), idx + 1);
      }
      setSearchMatches(matches);
      setLastSearch(search);
      if (matches.length > 0) {
        setSelection({ index: matches[0], length: search.length });
        setSearchStats({ current: 1, total: matches.length });
      } else {
        setSearchStats({ current: 0, total: 0 });
      }
      return;
    }
    if (matches.length === 0) return;
    let nextIdx = (searchStats.current % matches.length);
    setSelection({ index: matches[nextIdx], length: search.length });
    setSearchStats(prev => ({ ...prev, current: nextIdx + 1 }));
  };

  const handleReplace = (search: string, replacement: string) => {
    if (!search) return;
    const idx = jsonText.toLowerCase().indexOf(search.toLowerCase());
    if (idx !== -1) {
      saveToHistory(jsonText);
      const newText = jsonText.substring(0, idx) + replacement + jsonText.substring(idx + search.length);
      setJsonText(newText);
      setLastSearch('');
      setSearchMatches([]);
    }
  };

  const handleReplaceAll = (search: string, replacement: string) => {
    if (!search) return;
    saveToHistory(jsonText);
    const newText = jsonText.split(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(replacement);
    setJsonText(newText);
    setLastSearch('');
    setSearchMatches([]);
    setSearchStats({ current: 0, total: 0 });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">JS</div>
          <h1 className="text-xl font-bold tracking-tight">JSON Master Studio</h1>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {error ? (
            <span className="text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/30 font-medium">Error de Sintaxis</span>
          ) : jsonText ? (
            <span className="text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/30 font-medium">JSON Válido</span>
          ) : null}
          <div className="text-slate-500 bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
            {jsonText.length} caracteres
          </div>
        </div>
      </header>

      <Toolbar 
        onFormat={handleFormat}
        onMinify={handleMinify}
        onEscape={handleEscape}
        onUnescape={handleUnescape}
        onCopy={handleCopy}
        onClear={handleClear}
        onGenerateBody={handleGenerateBody}
        onUndo={handleUndo}
        isValid={!!parsedData}
        canEscape={canEscapeAction}
        canUndo={history.length > 0}
      />

      <main className="flex flex-grow overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col flex-shrink-0">
          <div className="p-3 bg-slate-800/50 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 border-b border-slate-800 flex justify-between items-center">
            <span>JSViewer</span>
            <span className="opacity-50">Navegación</span>
          </div>
          <div className="flex-grow overflow-hidden">
            <JsonTreeView data={parsedData} onSelectPath={handleSelectPath} activePath={activePath} />
          </div>
        </aside>

        <section className="flex-grow overflow-hidden flex flex-col relative">
          {showSearch && (
            <FindReplacePanel 
              onFind={handleFind}
              onReplace={handleReplace}
              onReplaceAll={handleReplaceAll}
              onClose={() => setShowSearch(false)}
              findCount={searchStats}
            />
          )}

          <JsonEditor 
            value={jsonText} 
            onChange={(newText) => {
              setJsonText(newText);
            }} 
            selection={selection}
            onSelectionApplied={clearSelection}
          />
          {error && (
            <div className="absolute bottom-4 right-6 left-20 bg-red-900/90 text-red-100 p-3 rounded-lg border border-red-700 text-xs mono shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="font-bold mb-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                JSON Error:
              </div>
              {error}
            </div>
          )}
        </section>
      </main>

      <footer className="px-4 py-1.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between items-center font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Sistema Listo
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-slate-600 italic">Clic en JSViewer para navegar</span>
          <div className="w-px h-3 bg-slate-800"></div>
          <span className="text-indigo-400">JSTool Engine</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
