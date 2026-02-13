
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

/**
 * Escapes characters according to specific rules:
 * \b, \f, \n, \r, \t, ", \
 */
export const escapeJson = (text: string): string => {
  return text.split('').map(char => ESCAPE_MAP[char] || char).join('');
};

/**
 * Unescapes character sequences back to their originals.
 * Correctly handles \n and avoids common double-replace issues by using a single regex pass.
 */
export const unescapeJson = (text: string): string => {
  return text.replace(/\\([bfnrt"\\])/g, (match, p1) => {
    const map: Record<string, string> = {
      'b': '\b',
      'f': '\f',
      'n': '\n',
      'r': '\r',
      't': '\t',
      '"': '"',
      '\\': '\\'
    };
    return map[p1] || match;
  });
};

export const canBeEscaped = (text: string): boolean => {
  if (!text) return false;
  // Check for presence of characters that need escaping
  if (/[\b\f\n\r\t]/.test(text)) return true;
  
  const chars = text.split('');
  for (let i = 0; i < chars.length; i++) {
    // Unescaped double quote
    if (chars[i] === '"') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && chars[j] === '\\') {
        backslashCount++;
        j--;
      }
      if (backslashCount % 2 === 0) return true;
    }
    // Bare backslash (not part of a valid escape sequence)
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
 * Finds the matching pair of a bracket or brace at the given index.
 */
export const findMatchingBracket = (text: string, index: number): number => {
  const char = text[index];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '}': '{', ']': '[' };
  const target = pairs[char];
  if (!target) return -1;

  const direction = (char === '{' || char === '[') ? 1 : -1;
  let depth = 0;
  let inString = false;

  for (let i = index; direction > 0 ? i < text.length : i >= 0; i += direction) {
    const c = text[i];
    if (c === '"' && (i === 0 || text[i - 1] !== '\\')) inString = !inString;
    if (inString) continue;

    if (c === char) depth++;
    if (c === target) depth--;

    if (depth === 0) return i;
  }

  return -1;
};

/**
 * Helper to find the end index of a JSON value starting at a given index.
 */
export function findEndOfValue(json: string, start: number): number {
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
      if (json[j] === '"' && (j === 0 || json[j - 1] !== '\\')) inString = !inString;
      if (inString) continue;
      if (json[j] === open) depth++;
      if (json[j] === close) depth--;
      if (depth === 0) return j + 1;
    }
  } else if (char === '"') {
    for (let j = i + 1; j < json.length; j++) {
      if (json[j] === '"' && (j === 0 || json[j - 1] !== '\\')) return j + 1;
    }
  } else {
    const match = /[,\s\}\]]/.exec(json.substring(i));
    if (match) return i + match.index;
    return json.length;
  }
  return -1;
}

export const findPathInString = (json: string, path: string): { index: number; length: number } | null => {
  const segments = path.split('.').filter(s => s !== 'root');
  if (segments.length === 0) return { index: 0, length: 1 };

  let cursor = 0;
  let lastMatch = { index: -1, length: 0 };

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isNumeric = !isNaN(Number(segment));

    while (cursor < json.length && !/[{\["]/.test(json[cursor]) && !/[0-9tfn\-]/.test(json[cursor])) {
      cursor++;
    }

    if (isNumeric) {
      const targetIndex = parseInt(segment, 10);
      if (json[cursor] !== '[') return null;
      cursor++; 

      let currentElementIdx = 0;
      while (currentElementIdx < targetIndex) {
        const end = findEndOfValue(json, cursor);
        if (end === -1) return null;
        cursor = end;
        while (cursor < json.length && (/\s/.test(json[cursor]) || json[cursor] === ',')) {
          cursor++;
        }
        currentElementIdx++;
      }
      
      const elementEnd = findEndOfValue(json, cursor);
      lastMatch = { index: cursor, length: Math.min(2, elementEnd - cursor) }; 
      if (i === segments.length - 1) return lastMatch;
      
    } else {
      if (json[cursor] !== '{') return null;
      const objectStart = cursor;
      const objectEnd = findEndOfValue(json, objectStart);
      
      let keyFound = false;
      let searchPtr = objectStart + 1;

      while (searchPtr < objectEnd) {
        while (searchPtr < objectEnd && json[searchPtr] !== '"') {
          searchPtr++;
        }
        if (searchPtr >= objectEnd) break;

        const keyStart = searchPtr;
        const keyEnd = findEndOfValue(json, keyStart);
        const foundKey = json.substring(keyStart + 1, keyEnd - 1);

        if (foundKey === segment) {
          lastMatch = { index: keyStart, length: keyEnd - keyStart };
          searchPtr = keyEnd;
          while (searchPtr < objectEnd && json[searchPtr] !== ':') searchPtr++;
          searchPtr++; 
          cursor = searchPtr;
          keyFound = true;
          break;
        } else {
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
