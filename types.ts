
export interface JsonTreeItem {
  key: string;
  value: any;
  path: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  isExpanded?: boolean;
}

export interface EditorPosition {
  index: number;
  length: number;
}
