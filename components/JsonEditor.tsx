
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  const [charWidth, setCharWidth] = useState(0); 
  const [viewportHeight, setViewportHeight] = useState(0);
  
  const [matchingPair, setMatchingPair] = useState<{ 
    startLine: number; 
    endLine: number; 
    startCol: number;
    endCol: number;
    indentCol: number;
    type: '{' | '[';
  } | null>(null);

  const LINE_HEIGHT = 24; 
  const PADDING_TOP = 16;
  const PADDING_LEFT = 20;

  // Medición de ultra-precisión para evitar desplazamiento en líneas largas
  useEffect(() => {
    const measure = () => {
      if (!textareaRef.current) return;
      const span = document.createElement('span');
      // Forzamos estilos idénticos para la medición
      span.style.fontFamily = '"Fira Code", monospace';
      span.style.fontSize = '14px';
      span.style.fontWeight = '400';
      span.style.fontVariantLigatures = 'none';
      span.style.letterSpacing = '0px';
      span.style.whiteSpace = 'pre';
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.textRendering = 'optimizeSpeed';
      
      const SAMPLES = 100000;
      span.textContent = '0'.repeat(SAMPLES);
      document.body.appendChild(span);
      const width = span.getBoundingClientRect().width / SAMPLES;
      document.body.removeChild(span);
      
      if (width > 0) setCharWidth(width);
    };

    measure();
    const ro = new ResizeObserver(() => {
      if (textareaRef.current) setViewportHeight(textareaRef.current.clientHeight);
      measure();
    });
    if (textareaRef.current) ro.observe(textareaRef.current);
    
    document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  const lines = useMemo(() => value.split('\n'), [value]);
  const totalLines = lines.length;

  // Virtualización: Solo calculamos y renderizamos lo que se ve
  const visibleStartIndex = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - 5);
  const visibleEndIndex = Math.min(totalLines, Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + 5);

  const updateBracketMatching = useCallback((pos: number) => {
    if (!charWidth || !value) return;

    // Lógica para detectar el bracket si el cursor está antes o después
    const charAtCursor = value[pos];
    const charBeforeCursor = value[pos - 1];
    
    let targetPos = -1;
    let originPos = -1;

    const isBracket = (c: string) => ['{', '[', '}', ']'].includes(c);

    if (isBracket(charAtCursor)) {
      originPos = pos;
      targetPos = findMatchingBracket(value, pos);
    } else if (isBracket(charBeforeCursor)) {
      originPos = pos - 1;
      targetPos = findMatchingBracket(value, pos - 1);
    }

    if (targetPos !== -1 && originPos !== -1) {
      const startIdx = Math.min(originPos, targetPos);
      const endIdx = Math.max(originPos, targetPos);
      
      const linesBeforeS = value.substring(0, startIdx).split('\n');
      const linesBeforeE = value.substring(0, endIdx).split('\n');
      
      const sLine = linesBeforeS.length - 1;
      const eLine = linesBeforeE.length - 1;
      
      const sCol = linesBeforeS[sLine].length;
      const eCol = linesBeforeE[eLine].length;

      const indentMatch = lines[sLine].match(/^\s*/);
      const indent = indentMatch ? indentMatch[0].length : 0;

      setMatchingPair({ 
        startLine: sLine, 
        endLine: eLine, 
        startCol: sCol,
        endCol: eCol,
        indentCol: indent,
        type: value[startIdx] as '{' | '['
      });
    } else {
      setMatchingPair(null);
    }
  }, [value, charWidth, lines]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    try {
      const parsed = JSON.parse(pastedText);
      if (parsed && typeof parsed === 'object') {
        e.preventDefault();
        const formatted = JSON.stringify(parsed, null, 2);
        const start = e.currentTarget.selectionStart;
        const end = e.currentTarget.selectionEnd;
        const newValue = value.substring(0, start) + formatted + value.substring(end);
        onChange(newValue);
        const newPos = start + formatted.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(newPos, newPos);
            updateBracketMatching(newPos);
            textareaRef.current.focus();
          }
        }, 0);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (selection && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.setSelectionRange(selection.index, selection.index + selection.length);
      const targetLine = value.substring(0, selection.index).split('\n').length - 1;
      setActiveLine(targetLine);
      updateBracketMatching(selection.index);
      
      const linePixelTop = (targetLine * LINE_HEIGHT) + PADDING_TOP;
      textarea.scrollTo({ top: linePixelTop - (textarea.clientHeight / 2), behavior: 'smooth' });
      onSelectionApplied();
    }
  }, [selection, value, charWidth, updateBracketMatching, onSelectionApplied]);

  const handleAction = (e: any) => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    setActiveLine(value.substring(0, pos).split('\n').length - 1);
    updateBracketMatching(pos);
  };

  // Renderizado optimizado del gutter visible
  const gutterLines = [];
  for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
    gutterLines.push(
      <div 
        key={i} 
        className="h-[24px] leading-[24px] flex items-center justify-end px-2"
        style={{ position: 'absolute', top: `${i * LINE_HEIGHT}px`, width: '100%' }}
      >
        <span className={`text-[11px] font-mono ${activeLine === i ? 'text-slate-200' : 'text-slate-600'}`}>
          {i + 1}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0d1117] relative overflow-hidden">
      {/* Gutter Virtualizado */}
      <div 
        ref={gutterRef}
        className="w-12 bg-[#010409] select-none flex-shrink-0 border-r border-slate-800 relative z-20"
      >
        <div 
          className="absolute top-0 left-0 w-full"
          style={{ transform: `translateY(${-scrollTop + PADDING_TOP}px)` }}
        >
          {gutterLines}
        </div>
      </div>
      
      <div className="flex-grow relative h-full overflow-hidden bg-[#0d1117]">
        {/* Capa de Resaltado Visual */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{ transform: `translateY(${-scrollTop + PADDING_TOP}px)` }}
        >
          {matchingPair && charWidth > 0 && (
            <>
              {/* Guía Vertical */}
              <div 
                className={`absolute border-l ${matchingPair.type === '{' ? 'border-emerald-500/30' : 'border-indigo-500/30'}`}
                style={{ 
                  top: `${(matchingPair.startLine * LINE_HEIGHT) + 18}px`, 
                  height: `${(matchingPair.endLine - matchingPair.startLine) * LINE_HEIGHT - 12}px`,
                  left: `${PADDING_LEFT + (matchingPair.indentCol * charWidth) + (charWidth / 2)}px`
                }}
              />

              {/* Recuadro de Apertura */}
              <div 
                className={`absolute rounded-sm border ${matchingPair.type === '{' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-indigo-500/10 border-indigo-500/40'}`}
                style={{ 
                  top: `${matchingPair.startLine * LINE_HEIGHT}px`,
                  left: `${PADDING_LEFT + (matchingPair.startCol * charWidth)}px`,
                  width: `${charWidth}px`,
                  height: `${LINE_HEIGHT}px`
                }}
              />

              {/* Recuadro de Cierre */}
              <div 
                className={`absolute rounded-sm border ${matchingPair.type === '{' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-indigo-500/10 border-indigo-500/40'}`}
                style={{ 
                  top: `${matchingPair.endLine * LINE_HEIGHT}px`,
                  left: `${PADDING_LEFT + (matchingPair.endCol * charWidth)}px`,
                  width: `${charWidth}px`,
                  height: `${LINE_HEIGHT}px`
                }}
              />
            </>
          )}

          {activeLine !== null && (
            <div 
              className="absolute left-0 right-0 bg-white/[0.03] border-y border-white/[0.02]"
              style={{ top: `${activeLine * LINE_HEIGHT}px`, height: `${LINE_HEIGHT}px` }}
            />
          )}
        </div>

        <textarea
          ref={textareaRef}
          className="absolute inset-0 w-full h-full bg-transparent text-slate-300 outline-none resize-none overflow-auto z-10 selection:bg-indigo-500/30 whitespace-pre scrollbar-thin"
          style={{ 
            paddingTop: `${PADDING_TOP}px`, 
            paddingLeft: `${PADDING_LEFT}px`,
            lineHeight: `${LINE_HEIGHT}px`,
            fontFamily: '"Fira Code", monospace',
            fontSize: '14px',
            fontVariantLigatures: 'none',
            letterSpacing: '0px',
            textRendering: 'optimizeSpeed'
          }}
          value={value}
          onChange={(e) => { onChange(e.target.value); handleAction(e); }}
          onScroll={handleScroll}
          onKeyUp={handleAction}
          onMouseUp={handleAction}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const n = value.substring(0, s) + "  " + value.substring(e.currentTarget.selectionEnd);
              onChange(n);
              setTimeout(() => { e.currentTarget.setSelectionRange(s+2, s+2); updateBracketMatching(s+2); }, 0);
            }
          }}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default JsonEditor;
