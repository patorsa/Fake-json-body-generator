
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { findMatchingBracket } from '../utils/jsonProcessor';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  selection: { index: number; length: number } | null;
  onSelectionApplied: () => void;
}

const JsonEditor: React.FC<JsonEditorProps> = ({ value, onChange, selection, onSelectionApplied }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [matchingPair, setMatchingPair] = useState<{ 
    startLine: number; 
    endLine: number; 
    indent: number;
    startCol: number;
    endCol: number;
    type: '{' | '[';
  } | null>(null);

  // Parámetros de renderizado ultra-precisos para Fira Code 14px
  const LINE_HEIGHT = 24; 
  const PADDING_TOP = 16;
  const PADDING_LEFT = 16; 
  const CHAR_WIDTH = 8.435; // Ajuste fino para alineación de caracteres mono

  const lines = useMemo(() => value.split('\n'), [value]);
  const lineCount = lines.length;

  const foldingMarkers = useMemo(() => {
    return lines.map(line => {
      const trimmed = line.trim();
      return trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('{,') || trimmed.endsWith('[,');
    });
  }, [lines]);

  const updateBracketMatching = (pos: number) => {
    const char = value[pos];
    const prevChar = value[pos - 1];
    
    let targetPos = -1;
    let originPos = -1;

    // Detectar si el cursor toca un bracket (delante o detrás)
    if (['{', '[', '}', ']'].includes(char)) {
      originPos = pos;
      targetPos = findMatchingBracket(value, pos);
    } else if (['{', '[', '}', ']'].includes(prevChar)) {
      originPos = pos - 1;
      targetPos = findMatchingBracket(value, pos - 1);
    }

    if (targetPos !== -1 && originPos !== -1) {
      const start = Math.min(originPos, targetPos);
      const end = Math.max(originPos, targetPos);
      
      const textBeforeStart = value.substring(0, start);
      const textBeforeEnd = value.substring(0, end);
      
      const startLineIdx = textBeforeStart.split('\n').length - 1;
      const endLineIdx = textBeforeEnd.split('\n').length - 1;
      
      const startLineText = lines[startLineIdx];
      const startCol = start - textBeforeStart.lastIndexOf('\n') - 1;
      const endCol = end - textBeforeEnd.lastIndexOf('\n') - 1;

      const indentMatch = startLineText.match(/^\s*/);
      const indent = indentMatch ? indentMatch[0].length : 0;
      const type = value[start] as '{' | '[';

      setMatchingPair({ 
        startLine: startLineIdx, 
        endLine: endLineIdx, 
        indent,
        startCol,
        endCol,
        type
      });
    } else {
      setMatchingPair(null);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const st = e.currentTarget.scrollTop;
    setScrollTop(st);
    if (gutterRef.current) gutterRef.current.scrollTop = st;
  };

  useEffect(() => {
    if (selection && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(selection.index, selection.index + selection.length);
      
      const textBefore = value.substring(0, selection.index);
      const targetLine = textBefore.split('\n').length - 1;
      
      setActiveLine(targetLine);
      updateBracketMatching(selection.index);

      const linePixelTop = (targetLine * LINE_HEIGHT) + PADDING_TOP;
      const viewportHeight = textarea.clientHeight;
      const targetScrollTop = linePixelTop - (viewportHeight / 2) + (LINE_HEIGHT / 2);
      
      textarea.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      onSelectionApplied();
    }
  }, [selection, onSelectionApplied, value]);

  const handleFold = (lineIdx: number) => {
    const lineText = lines[lineIdx];
    const bracketIdx = lineText.search(/[\{\[]/);
    if (bracketIdx === -1) return;

    const textBeforeLine = lines.slice(0, lineIdx).join('\n');
    const startIdx = textBeforeLine.length + (lineIdx > 0 ? 1 : 0) + bracketIdx;
    const endIdx = findMatchingBracket(value, startIdx);
    
    if (endIdx !== -1 && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(startIdx, endIdx + 1);
      updateBracketMatching(startIdx);
    }
  };

  const handleAction = (e: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const line = value.substring(0, pos).split('\n').length - 1;
    setActiveLine(line);
    updateBracketMatching(pos);
  };

  return (
    <div className="flex h-full bg-slate-900 mono text-[14px] relative overflow-hidden">
      {/* Gutter: Números y Plegado */}
      <div 
        ref={gutterRef}
        className="w-14 bg-slate-950 text-slate-600 text-right pr-2 select-none flex-shrink-0 border-r border-slate-800 overflow-hidden"
        style={{ paddingTop: `${PADDING_TOP}px` }}
      >
        {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
          <div 
            key={i} 
            className={`h-[24px] leading-[24px] flex items-center justify-end gap-1.5 transition-colors ${activeLine === i ? 'text-indigo-400 font-bold bg-indigo-500/10' : ''}`}
          >
            {foldingMarkers[i] && (
              <button 
                onClick={() => handleFold(i)}
                className="text-[10px] text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer p-0.5"
              >
                ▼
              </button>
            )}
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
      
      <div className="flex-grow relative h-full">
        {/* CAPA VISUAL - SINCRONIZADA */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{ transform: `translateY(-${scrollTop}px)` }}
        >
          {matchingPair && (
            <>
              {/* Guía Vertical (Verde para objetos, Roja para arrays) */}
              <div 
                className={`absolute border-l-2 ${matchingPair.type === '{' ? 'border-emerald-500' : 'border-red-500'} transition-all`}
                style={{ 
                  top: `${(matchingPair.startLine * LINE_HEIGHT) + PADDING_TOP + (LINE_HEIGHT / 2) + 4}px`, 
                  height: `${(matchingPair.endLine - matchingPair.startLine) * LINE_HEIGHT - 8}px`,
                  left: `${PADDING_LEFT + (matchingPair.indent * CHAR_WIDTH) + 4}px`,
                  boxShadow: matchingPair.type === '{' ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(239,68,68,0.4)'
                }}
              />

              {/* Resaltado de Apertura */}
              <div 
                className={`absolute rounded-sm border ${matchingPair.type === '{' ? 'bg-emerald-500/40 border-emerald-400' : 'bg-red-500/40 border-red-400'}`}
                style={{ 
                  top: `${(matchingPair.startLine * LINE_HEIGHT) + PADDING_TOP}px`,
                  left: `${PADDING_LEFT + (matchingPair.startCol * CHAR_WIDTH)}px`,
                  width: `${CHAR_WIDTH}px`,
                  height: `${LINE_HEIGHT}px`
                }}
              />

              {/* Resaltado de Cierre */}
              <div 
                className={`absolute rounded-sm border ${matchingPair.type === '{' ? 'bg-emerald-500/40 border-emerald-400' : 'bg-red-500/40 border-red-400'}`}
                style={{ 
                  top: `${(matchingPair.endLine * LINE_HEIGHT) + PADDING_TOP}px`,
                  left: `${PADDING_LEFT + (matchingPair.endCol * CHAR_WIDTH)}px`,
                  width: `${CHAR_WIDTH}px`,
                  height: `${LINE_HEIGHT}px`
                }}
              />
            </>
          )}

          {/* Línea Activa */}
          {activeLine !== null && (
            <div 
              className="absolute left-0 right-0 bg-indigo-500/5 border-y border-indigo-500/10"
              style={{ 
                top: `${(activeLine * LINE_HEIGHT) + PADDING_TOP}px`, 
                height: `${LINE_HEIGHT}px`
              }}
            />
          )}
        </div>

        {/* AREA DE TEXTO */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); handleAction(e); }}
          onScroll={handleScroll}
          onClick={handleAction}
          onKeyUp={handleAction}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const n = value.substring(0, s) + "  " + value.substring(e.currentTarget.selectionEnd);
              onChange(n);
              setTimeout(() => { e.currentTarget.setSelectionRange(s + 2, s + 2); updateBracketMatching(s + 2); }, 0);
            }
            handleAction(e);
          }}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent text-slate-200 px-4 leading-[24px] outline-none resize-none overflow-auto whitespace-pre selection:bg-indigo-500/30 z-10"
          style={{ 
            paddingTop: `${PADDING_TOP}px`,
            lineHeight: `${LINE_HEIGHT}px`,
            fontFamily: '"Fira Code", monospace',
            caretColor: '#818cf8'
          }}
          placeholder='Pega tu JSON aquí...'
        />
      </div>
    </div>
  );
};

export default JsonEditor;
