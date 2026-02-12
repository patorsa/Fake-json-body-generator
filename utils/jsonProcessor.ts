
/**
 * Utility for advanced JSON operations: Format, Minify, Escape, Unescape.
 */

export const formatJson = (json: string): string => {
  try {
    const obj = JSON.parse(json);
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return json;
  }
};

export const minifyJson = (json: string): string => {
  try {
    const obj = JSON.parse(json);
    return JSON.stringify(obj);
  } catch (e) {
    return json;
  }
};

const ESCAPE_MAP: Record<string, string> = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '"': '\\"',
  '\\': '\\\\'
};

const UNESCAPE_MAP: Record<string, string> = {
  '\\b': '\b',
  '\\f': '\f',
  '\\n': '\n',
  '\\r': '\r',
  '\\t': '\t',
  '\\"': '"',
  '\\\\': '\\'
};

export const escapeJson = (text: string): string => {
  return text.split('').map(char => ESCAPE_MAP[char] || char).join('');
};

export const unescapeJson = (text: string): string => {
  let result = text;
  Object.entries(UNESCAPE_MAP).forEach(([escaped, original]) => {
    const regex = new RegExp(escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, original);
  });
  return result;
};

export const canBeEscaped = (text: string): boolean => {
  if (!text) return false;
  if (/[\b\f\n\r\t]/.test(text)) return true;
  const chars = text.split('');
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === '"') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && chars[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) return true;
    }
    if (chars[i] === '\\') {
      const next = chars[i+1];
      if (!next || !['b', 'f', 'n', 'r', 't', '"', '\\'].includes(next)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Finds the correct index of a nested key or array element by scanning only the current scope.
 */
export const findPathInString = (json: string, path: string): { index: number; length: number } | null => {
  const segments = path.split('.').filter(s => s !== 'root');
  if (segments.length === 0) return { index: 0, length: 1 };

  let cursor = 0;
  let lastMatch = { index: -1, length: 0 };

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isNumeric = !isNaN(Number(segment));

    // Move cursor to start of current object or array content
    while (cursor < json.length && !/[{\["]/.test(json[cursor]) && !/[0-9tfn\-]/.test(json[cursor])) {
      cursor++;
    }

    if (isNumeric) {
      const targetIndex = parseInt(segment, 10);
      if (json[cursor] !== '[') return null;
      cursor++; // step inside [

      let currentElementIdx = 0;
      while (currentElementIdx < targetIndex) {
        const end = findEndOfValue(json, cursor);
        if (end === -1) return null;
        cursor = end;
        // Skip whitespace and comma to get to next element
        while (cursor < json.length && (/\s/.test(json[cursor]) || json[cursor] === ',')) {
          cursor++;
        }
        currentElementIdx++;
      }
      
      // We are at the start of the target element
      const elementEnd = findEndOfValue(json, cursor);
      lastMatch = { index: cursor, length: Math.min(2, elementEnd - cursor) }; // Highlight first 2 chars (e.g. "{ " or "[ ")
      if (i === segments.length - 1) return lastMatch;
      
    } else {
      // Find key "segment" at depth 0 of the current object
      if (json[cursor] !== '{') return null;
      const objectStart = cursor;
      const objectEnd = findEndOfValue(json, objectStart);
      
      let keyFound = false;
      let searchPtr = objectStart + 1;

      while (searchPtr < objectEnd) {
        // Skip to next potential key (must be a string at depth 1)
        while (searchPtr < objectEnd && json[searchPtr] !== '"') {
          searchPtr++;
        }
        if (searchPtr >= objectEnd) break;

        const keyStart = searchPtr;
        const keyEnd = findEndOfValue(json, keyStart);
        const foundKey = json.substring(keyStart + 1, keyEnd - 1);

        if (foundKey === segment) {
          lastMatch = { index: keyStart, length: keyEnd - keyStart };
          // Move cursor to the value of this key
          searchPtr = keyEnd;
          while (searchPtr < objectEnd && json[searchPtr] !== ':') searchPtr++;
          searchPtr++; // Skip :
          cursor = searchPtr;
          keyFound = true;
          break;
        } else {
          // Skip the value of this wrong key to stay at depth 1
          searchPtr = keyEnd;
          while (searchPtr < objectEnd && json[searchPtr] !== ':') searchPtr++;
          searchPtr++;
          searchPtr = findEndOfValue(json, searchPtr);
          while (searchPtr < objectEnd && (/\s/.test(json[searchPtr]) || json[searchPtr] === ',')) searchPtr++;
        }
      }

      if (!keyFound) return null;
      if (i === segments.length - 1) return lastMatch;
    }
  }

  return lastMatch.index !== -1 ? lastMatch : null;
};

/**
 * Helper to find the end index of a JSON value starting at a given index.
 */
function findEndOfValue(json: string, start: number): number {
  let i = start;
  while (i < json.length && /\s/.test(json[i])) i++;
  if (i >= json.length) return -1;

  const char = json[i];
  if (char === '{' || char === '[') {
    const open = char;
    const close = char === '{' ? '}' : ']';
    let depth = 1;
    let inString = false;
    for (let j = i + 1; j < json.length; j++) {
      if (json[j] === '"' && json[j - 1] !== '\\') inString = !inString;
      if (inString) continue;
      if (json[j] === open) depth++;
      if (json[j] === close) depth--;
      if (depth === 0) return j + 1;
    }
  } else if (char === '"') {
    for (let j = i + 1; j < json.length; j++) {
      if (json[j] === '"' && json[j - 1] !== '\\') return j + 1;
    }
  } else {
    // primitive
    const match = /[,\s\}\]]/.exec(json.substring(i));
    if (match) return i + match.index;
    return json.length;
  }
  return -1;
}
