import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
function fenceAttributes(info: string): {alt?: string; caption?: string} {
  const body = info.slice('gnuplot'.length).trim();
  if (!body) return {};
  // An incomplete attribute block must never prevent the plot from rendering.
  if (!body.startsWith('{') || !body.endsWith('}')) return {};
  const attributes: {alt?: string; caption?: string} = {};
  let remaining = body.slice(1, -1).trim();
  while (remaining) {
    const match = /^([\w-]+)\s*=\s*("(?:\\["\\]|[^"\\])*"|'(?:\\['\\]|[^'\\])*')(?:\s+|$)/.exec(remaining);
    if (match) {
      const key = match[1];
      if ((key === 'alt' || key === 'caption') && attributes[key] === undefined) {
        attributes[key] = match[2]!.slice(1, -1).replace(/\\(["'\\])/g, '$1');
      }
      remaining = remaining.slice(match[0].length);
      continue;
    }
    // Skip one malformed field, respecting quotes so text inside a broken
    // value cannot accidentally become a supported attribute.
    let quote = '';
    let end = 0;
    for (; end < remaining.length; end++) {
      const char = remaining[end]!;
      if (quote) {
        if (char === '\\') { end++; continue; }
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (/\s/.test(char)) break;
    }
    remaining = remaining.slice(end).trimStart();
  }
  return attributes;
}
export function markdownPlugin(md: MarkdownIt, render: (source: string, env:unknown) => string): MarkdownIt {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    const info = token.info.trim();
    if (info !== 'gnuplot' && !/^gnuplot\s+\{/.test(info)) {
      return original ? original(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
    }
    try {
      const attributes = fenceAttributes(info);
      if(token.content.length>64_000)throw new Error('Gnuplot source exceeds the 64 KB limit.');
      let plot = render(token.content, env);
      if (attributes.alt !== undefined && /<svg\b/.test(plot)) {
        plot = `<div role="img" aria-label="${md.utils.escapeHtml(attributes.alt)}">${plot}</div>`;
      }
      if (attributes.caption !== undefined) {
        return `<figure class="gnuplot-markdown-preview">${plot}<figcaption>${md.utils.escapeHtml(attributes.caption)}</figcaption></figure>\n`;
      }
      return `<div class="gnuplot-markdown-preview">${plot}</div>\n`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to render plot.';
      return `<div class="gnuplot-error" role="alert"><pre>${md.utils.escapeHtml(message)}</pre></div>\n`;
    }
  };
  return md;
}
