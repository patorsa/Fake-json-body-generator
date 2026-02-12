
import React, { useState } from 'react';

interface JsonTreeViewProps {
  data: any;
  onSelectPath: (path: string) => void;
  activePath?: string;
}

const TreeItem: React.FC<{
  name: string;
  value: any;
  path: string;
  depth: number;
  onSelectPath: (path: string) => void;
  activePath?: string;
}> = ({ name, value, path, depth, onSelectPath, activePath }) => {
  // Nodes start collapsed by default
  const [isExpanded, setIsExpanded] = useState(false);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isActive = activePath === path;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isObject) setIsExpanded(!isExpanded);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectPath(path);
  };

  const renderValuePreview = () => {
    if (isArray) return <span className="text-slate-500 italic">[{value.length}]</span>;
    if (isObject) return <span className="text-slate-500 italic">{'{...}'}</span>;
    if (typeof value === 'string') return <span className="text-emerald-400">"{value}"</span>;
    if (typeof value === 'number') return <span className="text-amber-400">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-sky-400">{value.toString()}</span>;
    if (value === null) return <span className="text-slate-400 font-bold uppercase text-[10px]">null</span>;
    return <span>{String(value)}</span>;
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-1 py-0.5 px-2 cursor-pointer transition-all duration-150 group
          ${isActive ? 'bg-indigo-600/30 border-r-2 border-indigo-500' : 'hover:bg-slate-700/50'} 
          ${depth > 0 ? 'ml-4' : ''}`}
        onClick={handleSelect}
      >
        {isObject && (
          <button 
            onClick={toggle}
            className={`w-4 h-4 flex items-center justify-center transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'} text-slate-500 group-hover:text-white`}
          >
            ▼
          </button>
        )}
        {!isObject && <div className="w-4" />}
        <span className={`${isActive ? 'text-indigo-200' : 'text-indigo-300'} font-medium`}>{name}:</span>
        <div className="ml-1 truncate flex-grow">
          {renderValuePreview()}
        </div>
      </div>
      
      {isObject && isExpanded && (
        <div className="border-l border-slate-800 ml-2 mt-0.5">
          {Object.entries(value).map(([key, val]) => (
            <TreeItem 
              key={key}
              name={key}
              value={val}
              path={`${path}.${key}`}
              depth={depth + 1}
              onSelectPath={onSelectPath}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const JsonTreeView: React.FC<JsonTreeViewProps> = ({ data, onSelectPath, activePath }) => {
  if (!data) return <div className="p-4 text-slate-500 text-sm italic">No hay datos válidos.</div>;

  return (
    <div className="p-2 overflow-auto h-full mono text-sm scrollbar-thin">
      <TreeItem 
        name="root" 
        value={data} 
        path="root" 
        depth={0} 
        onSelectPath={onSelectPath}
        activePath={activePath}
      />
    </div>
  );
};

export default JsonTreeView;
