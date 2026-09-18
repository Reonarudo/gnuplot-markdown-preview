import { posix } from 'node:path';
export interface DataReference { readonly path: string; readonly start: number; readonly end: number; }
interface Token { value: string; start: number; end: number; quoted: boolean; }
/** Tokenize only enough syntax to identify literal plot operands, never labels/comments. */
export function dataReferences(source: string): DataReference[] {
  const tokens: Token[] = [];
  let i = 0;
  let lineStart = true;
  while (i < source.length) {
    if (lineStart) {
      const block = /^\s*\$[\w]+\s*<<\s*([\w]+)[^\n]*\n/.exec(source.slice(i));
      if (block) {
        i += block[0].length;
        while (i < source.length) {
          const end = source.indexOf('\n', i);
          const stop = end < 0 ? source.length : end;
          const line = source.slice(i, stop).trim(); i = end < 0 ? stop : end + 1;
          if (line === block[1]) break;
        }
        continue;
      }
    }
    const c = source[i]!;
    if (c === '\\' && /^\\\r?\n/.test(source.slice(i))) { i += source[i + 1] === '\r' ? 3 : 2; continue; }
    if (c === '#') { while (i < source.length && source[i] !== '\n') i++; continue; }
    if (/\s/.test(c) && c !== '\n') { i++; continue; }
    const start = i;
    if (c === '"' || c === "'") {
      i++; let value = '';
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\') {
          const next = source[++i];
          if (next === undefined) break;
          // Backslash escapes are intentionally limited for portable filenames.
          value += next === c || next === '\\' ? next : '\\' + next; i++;
        } else value += source[i++];
      }
      if (source[i] !== c) throw new Error('Unterminated quoted string in gnuplot source.');
      i++; tokens.push({value, start, end:i, quoted:true});
    } else if (/[\w$]/.test(c)) {
      while (i < source.length && /[\w$]/.test(source[i]!)) i++;
      tokens.push({value:source.slice(start,i),start,end:i,quoted:false});
    } else { i++; tokens.push({value:c,start,end:i,quoted:false}); }
    lineStart = c === '\n';
  }
  const references: DataReference[] = [];
  let plotting = false, operand = false, depth = 0, statement = true, rangeDepth=0;
  for (let n = 0; n < tokens.length; n++) {
    const t = tokens[n]!;
    if (!t.quoted && (t.value === '\n' || t.value === ';')) { plotting=false;operand=false;statement=true;depth=0;rangeDepth=0;continue; }
    if (statement) { plotting = !t.quoted && ['plot','splot'].includes(t.value.toLowerCase()); operand=plotting;statement=false; if(plotting)continue; }
    if (!plotting) continue;
    if(operand && !t.quoted && t.value==='['){rangeDepth++;continue;}
    if(rangeDepth){if(!t.quoted && t.value===']')rangeDepth--;continue;}
    if (operand) {
      operand=false;
      if (t.quoted && t.value) {
        const next=tokens[n+1];
        if(next && !next.quoted && ['.','+','?','['].includes(next.value)) throw new Error('Computed data filenames are not supported. Use a literal relative filename.');
        references.push({path:t.value,start:t.start,end:t.end});
      }
    }
    if (!t.quoted && ['(','[','{'].includes(t.value)) depth++;
    if (!t.quoted && [')',']','}'].includes(t.value)) depth--;
    if (!t.quoted && t.value === ',' && depth === 0) operand=true;
  }
  return references;
}
export function validateDataPath(path: string): string {
  if (!path || path.startsWith('/') || path.startsWith('~') || /[\\:\x00-\x1f]/.test(path) || path.startsWith('<')) throw new Error('Data files must use relative paths within this Markdown document’s workspace folder.');
  const normalized=posix.normalize(path);
  if (!/\.(csv|dat|txt)$/i.test(normalized)) throw new Error('Only .csv, .dat, and .txt data files are supported.');
  return normalized;
}
/** Replace filename operands, not the user's labels or gnuplot datafile options. */
export function mountSource(source:string, references:readonly DataReference[], names:ReadonlyMap<string,string>):string {
  let result=source;
  for(const ref of [...references].reverse()) result=result.slice(0,ref.start)+`"${names.get(ref.path)!}"`+result.slice(ref.end);
  return result;
}
