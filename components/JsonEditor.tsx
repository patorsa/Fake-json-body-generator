
import React, { useRef, useEffect, useState, useMemo } from 'react';

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
  const [lineCount, setLineCount] = useState(1);

  // Constants to ensure perfect math-to-render alignment
  const LINE_HEIGHT = 24; 
  const PADDING_TOP = 16;

  useEffect(() => {
    setLineCount(value.split('\n').length || 1);
  }, [value]);

  // Sync gutter scroll with textarea scroll
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  useEffect(() => {
    if (selection && textareaRef.current) {
      const textarea = textareaRef.current;
      
      // 1. Apply Selection
      textarea.focus();
      textarea.setSelectionRange(selection.index, selection.index + selection.length);
      
      // 2. Calculate Precise Scroll Position
      const textBefore = value.substring(0, selection.index);
      const linesBefore = textBefore.split('\n');
      const targetLine = linesBefore.length - 1;
      
      setActiveLine(targetLine);

      // The absolute pixel position of the target line relative to the top of the content
      const linePixelTop = (targetLine * LINE_HEIGHT) + PADDING_TOP;
      
      // The height of the visible area
      const viewportHeight = textarea.clientHeight;
      
      // Calculate scroll to center the line
      const targetScrollTop = linePixelTop - (viewportHeight / 2) + (LINE_HEIGHT / 2);
      
      textarea.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

      onSelectionApplied();
    }
  }, [selection, onSelectionApplied, value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Basic active line detection on type
    const pos = e.target.selectionStart;
    const line = e.target.value.substring(0, pos).split('\n').length - 1;
    setActiveLine(line);
  };

  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const pos = e.currentTarget.selectionStart;
    const line = value.substring(0, pos).split('\n').length - 1;
    setActiveLine(line);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  return (
    <div className="flex h-full bg-slate-900 mono text-sm relative overflow-hidden">
      {/* Line Numbers Gutter */}
      <div 
        ref={gutterRef}
        className="w-12 bg-slate-950 text-slate-600 text-right pr-2 select-none flex-shrink-0 border-r border-slate-800 overflow-hidden"
        style={{ paddingTop: `${PADDING_TOP}px` }}
      >
        {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
          <div 
            key={i} 
            className={`h-[24px] leading-[24px] transition-colors ${activeLine === i ? 'text-indigo-400 font-bold bg-indigo-500/10' : ''}`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      
      <div className="flex-grow relative overflow-hidden h-full">
        {/* Active Line Highlight Layer (Behind Textarea) */}
        {activeLine !== null && (
          <div 
            className="absolute left-0 right-0 bg-indigo-500/10 border-y border-indigo-500/20 pointer-events-none z-0"
            style={{ 
              top: `${(activeLine * LINE_HEIGHT) + PADDING_TOP}px`, 
              height: `${LINE_HEIGHT}px`,
              transform: `translateY(-${textareaRef.current?.scrollTop || 0}px)`
            }}
          />
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="absolute inset-0 w-full h-full bg-transparent text-slate-200 px-4 leading-[24px] outline-none resize-none overflow-auto whitespace-pre scroll-smooth selection:bg-indigo-500/40 z-10"
          style={{ 
            paddingTop: `${PADDING_TOP}px`,
            lineHeight: `${LINE_HEIGHT}px`
          }}
          placeholder='Pega o escribe tu JSON aquí...'
        />
      </div>
    </div>
  );
};

export default JsonEditor;
