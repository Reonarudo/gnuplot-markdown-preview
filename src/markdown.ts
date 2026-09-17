import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
export function markdownPlugin(md: MarkdownIt, render: (source: string) => string): MarkdownIt {
  const original = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    if (token.info.trim() !== 'gnuplot') {
      return original ? original(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
    }
    try {
      return `<div class="gnuplot-markdown-preview">${render(token.content)}</div>\n`;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to render plot.';
      return `<div class="gnuplot-error" role="alert"><pre>${md.utils.escapeHtml(message)}</pre></div>\n`;
    }
  };
  return md;
}
