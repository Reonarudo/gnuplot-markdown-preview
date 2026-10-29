import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import type { RenderResult } from '@reonarudo/gnuplot-renderer';

/** The prefix of the view toggle's classes (wrapper, button, rendering slot and glyphs), shared by the stylesheet and the preview script. */
export const BASE_CLASS = 'gnuplot';

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

/** The last rendering drawn per fence slot (the rendering slot's inner HTML only), bounded by entries and by characters. */
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
 *
 * Every claimed fence, whatever it shows, is wrapped with the view toggle (`fence` below), and
 * the slot caches only what sits in the rendering slot, so an edited fence that is not ready yet
 * shows its old plot beside its new source.
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
    // Before anything is rendered, so every return path below has the source view.
    const source = sourceView(md, original, tokens, index, options, env, self);

    let result: RenderResult | undefined;
    try {
      result = render(token.content, env);
    } catch (error) {
      // The library throws only for programmer errors, but a throw here would remove the whole
      // extension from the preview, so it degrades this fence alone.
      const cause = error instanceof Error ? error.message : String(error);
      report(`Gnuplot render failed: ${cause}`);
      return fence(token, errorBlock(`Gnuplot is unavailable: ${cause}`, escape), source);
    }
    if (result === undefined) return fence(token, (slot && slots.get(slot)) ?? wrap(md, LOADING, attributes), source);

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
    return fence(token, html, source);
  };
  return md;
}

// The view toggle (docs/source-toggle-spec.md in onnx-markdown-preview): every claimed fence is
// wrapped with a toggle button, its rendering, and the hidden source view that media/preview.js
// and preview.css swap.

type FenceRule = NonNullable<MarkdownIt['renderer']['rules']['fence']>;

/**
 * The source view: VS Code's highlighted `<pre><code>` for this fence, from the fence rule that
 * was registered before us, called with a shallow-cloned token so neither rule sees the other's
 * changes. Without one (bare markdown-it in a unit test) a plain escaped block stands in.
 */
function sourceView(md: MarkdownIt, original: FenceRule | undefined, ...args: Parameters<FenceRule>): string {
  const [tokens, index, options, env, self] = args;
  const token = tokens[index]!;
  if (!original) {
    const word = md.utils.escapeHtml(token.info.trim().split(/\s+/)[0] ?? '');
    return `<pre><code class="language-${word}">${md.utils.escapeHtml(token.content)}</code></pre>\n`;
  }
  const clone = Object.assign(Object.create(Object.getPrototypeOf(token)), token, {
    attrs: token.attrs ? token.attrs.map((attr) => [...attr]) : null
  });
  const copy = tokens.slice();
  copy[index] = clone;
  return unsynced(original(copy, index, options, env, self));
}

/**
 * Drop VS Code's `code-line` class and `data-line` from the delegated `<code>`, so the wrapper is
 * the one element VS Code's scroll sync sees for this fence. VS Code measures an element's height
 * up to its first nested `.code-line`; a hidden one has a zero rect, which collapsed the wrapper
 * to a pixel in rendering view and sent editor-to-preview sync to the top of the page.
 */
function unsynced(html: string): string {
  return html.replace(/^<pre><code\b[^>]*>/, (tag) =>
    tag.replace(/ data-line="[^"]*"/, '').replace(/ class="([^"]*)"/, (_, names: string) => {
      const kept = names.split(' ').filter((name) => name !== 'code-line').join(' ');
      return kept ? ` class="${kept}"` : '';
    }));
}

/**
 * The wrapper every claimed fence gets: toggle first, the rendering slot, then the source `<pre>`.
 * `code-line` and `data-line` keep VS Code's scroll sync; a token without a map (a bare string
 * through `markdown.api.render`) gets neither.
 */
function fence(token: { content: string; map: [number, number] | null }, rendering: string, source: string): string {
  const line = token.map?.[0];
  const classes = line === undefined ? `${BASE_CLASS}-fence` : `${BASE_CLASS}-fence code-line`;
  const lineAttr = line === undefined ? '' : ` data-line="${line}"`;
  return `<div class="${classes}"${lineAttr} data-fence-key="${fenceKey(token.content)}">${TOGGLE}` +
    `<div class="${BASE_CLASS}-rendering">${rendering}</div>${source}</div>\n`;
}

/** The fence key: FNV-1a, 32-bit, of the exact body, as eight hex digits. The script never hashes. */
function fenceKey(body: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    hash ^= body.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// Both glyphs ship; the stylesheet shows the one naming the view a click leads to.
const ICON_CODE = `<svg class="${BASE_CLASS}-icon-code" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">` +
  '<path d="M5.7 3.3 1 8l4.7 4.7.9-.9L2.8 8l3.8-3.8zM10.3 3.3l-.9.9L13.2 8l-3.8 3.8.9.9L15 8z"/></svg>';
const ICON_GRAPH = `<svg class="${BASE_CLASS}-icon-graph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2">` +
  '<rect x="1.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="9.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="5.5" y="11" width="5" height="3.5" rx=".5"/>' +
  '<path d="M4 5v3h8V5M8 8v3"/></svg>';
const TOGGLE = `<button type="button" class="${BASE_CLASS}-toggle" aria-pressed="false" aria-label="Source view" title="Source view">${ICON_CODE}${ICON_GRAPH}</button>`;
