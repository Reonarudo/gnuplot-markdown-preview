import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import type { RenderResult } from '@reonarudo/gnuplot-renderer';
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
/** The fence's result, or `undefined` while its data is still being prepared. */
export type Render = (source: string, env: unknown) => RenderResult | undefined;
export type Report = (message: string) => void;

type Escape = (text: string) => string;

const CLAIMED = /^gnuplot(\s+\{|$)/;

const LOADING = '<p role="status">Loading gnuplot plot…</p>';

/** The last HTML drawn per fence slot, bounded by entries and by characters. */
const MAX_SLOTS = 64;
const MAX_SLOT_CHARS = 16 * 1024 * 1024;

function errorBlock(text: string, escape: Escape): string {
  return `<div class="gnuplot-error" role="alert"><pre>${escape(text)}</pre></div>\n`;
}

/** The library's plain-text result as the words shown in place of a plot. */
function describe(result: Exclude<RenderResult, { status: 'success' }>): string {
  switch (result.status) {
    case 'failure': {
      const where = result.line === undefined
        ? ''
        : result.column === undefined ? ` at line ${result.line}` : ` at line ${result.line}, column ${result.column}`;
      return `Gnuplot error${where}: ${result.message}`;
    }
    case 'timeout':
      return `Gnuplot took longer than ${result.budget} ms; the plot was not rendered. Run Gnuplot: Refresh Data to try again.`;
    case 'unavailable':
      return `Gnuplot is unavailable: ${result.reason}`;
  }
}

function wrap(md: MarkdownIt, plot: string, attributes: { alt?: string; caption?: string }): string {
  const escape = md.utils.escapeHtml;
  if (attributes.alt !== undefined && /<svg\b/.test(plot)) {
    plot = `<div role="img" aria-label="${escape(attributes.alt)}">${plot}</div>`;
  }
  if (attributes.caption !== undefined) {
    return `<figure class="gnuplot-markdown-preview">${plot}<figcaption>${escape(attributes.caption)}</figcaption></figure>\n`;
  }
  return `<div class="gnuplot-markdown-preview">${plot}</div>\n`;
}

/**
 * Claim `gnuplot` fences and render them as plots; every other fence goes to the renderer that was
 * registered before us.
 *
 * Preparation is asynchronous, so a fence can be not ready yet. It then keeps showing whatever its
 * slot (the document and the fence's position among its gnuplot fences) last showed, so editing a
 * fence does not flash a placeholder on every keystroke. Only a slot seen for the first time shows
 * the loading message, and so does every fence rendered without a document (`markdown.api.render`
 * of a string), which has no slot: two unrelated strings must never show each other's plots.
 */
export function markdownPlugin(md: MarkdownIt, render: Render, report: Report = () => {}): MarkdownIt {
  const original = md.renderer.rules.fence;
  const slots = new Map<string, string>();
  let slotChars = 0;
  const remember = (slot: string, html: string): void => {
    const previous = slots.get(slot);
    if (previous !== undefined) { slotChars -= previous.length; slots.delete(slot); }
    slots.set(slot, html);
    slotChars += html.length;
    while (slots.size > MAX_SLOTS || slotChars > MAX_SLOT_CHARS) {
      const [oldest, dropped] = slots.entries().next().value!;
      slots.delete(oldest);
      slotChars -= dropped.length;
    }
  };

  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index]!;
    const info = token.info.trim();
    if (!CLAIMED.test(info)) {
      return original ? original(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
    }
    const escape = md.utils.escapeHtml;
    const attributes = fenceAttributes(info);
    const document = (env as { currentDocument?: { toString(): string } } | undefined)?.currentDocument;
    let slot: string | undefined;
    if (document) {
      let ordinal = 0;
      for (let before = 0; before < index; before++) {
        const other = tokens[before]!;
        if (other.type === 'fence' && CLAIMED.test(other.info.trim())) ordinal++;
      }
      slot = `${document.toString()}\n${ordinal}`;
    }

    let result: RenderResult | undefined;
    try {
      result = render(token.content, env);
    } catch (error) {
      // The library throws only for programmer errors, but a throw here would remove the whole
      // extension from the preview, so it degrades this fence alone.
      const cause = error instanceof Error ? error.message : String(error);
      report(`Gnuplot render failed: ${cause}`);
      return errorBlock(`Gnuplot is unavailable: ${cause}`, escape);
    }
    if (result === undefined) return (slot && slots.get(slot)) ?? wrap(md, LOADING, attributes);

    let html: string;
    if (result.status !== 'success') {
      html = errorBlock(describe(result), escape);
    } else {
      // `print` output and gnuplot's warnings, which used to be dropped.
      const notes = result.notes.length
        ? `<div class="gnuplot-notes">${result.notes.map(escape).join('<br>')}</div>`
        : '';
      html = notes + wrap(md, result.output, attributes);
    }
    if (slot) remember(slot, html);
    return html;
  };
  return md;
}
