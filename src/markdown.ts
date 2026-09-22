import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
function fenceAttributes(info: string): {alt?: string; caption?: string} {
  const body = info.slice('gnuplot'.length).trim();
  if (!body) return {};
  if (!body.startsWith('{') || !body.endsWith('}')) throw new Error('Gnuplot attributes must be enclosed in braces.');
  const attributes: {alt?: string; caption?: string} = {};
  let remaining = body.slice(1, -1).trim();
  while (remaining) {
    const match = /^(alt|caption)\s*=\s*("(?:\\["\\]|[^"\\])*"|'(?:\\['\\]|[^'\\])*')(?:\s+|$)/.exec(remaining);
    if (!match) throw new Error('Use quoted alt and caption attributes, separated by spaces.');
    const key = match[1] as 'alt' | 'caption';
    if (attributes[key] !== undefined) throw new Error(`Duplicate gnuplot attribute: ${key}.`);
    attributes[key] = match[2]!.slice(1, -1).replace(/\\(["'\\])/g, '$1');
    remaining = remaining.slice(match[0].length);
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
