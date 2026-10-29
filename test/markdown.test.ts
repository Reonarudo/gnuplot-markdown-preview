import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import type { RenderResult } from '@reonarudo/gnuplot-renderer';
import { markdownPlugin } from '../src/markdown';
import { rendering } from './helpers';
const ok = (output: string): RenderResult => ({ status: 'success', output, notes: [] });

const ICON_CODE = '<svg class="gnuplot-icon-code" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">' +
  '<path d="M5.7 3.3 1 8l4.7 4.7.9-.9L2.8 8l3.8-3.8zM10.3 3.3l-.9.9L13.2 8l-3.8 3.8.9.9L15 8z"/></svg>';
const ICON_GRAPH = '<svg class="gnuplot-icon-graph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2">' +
  '<rect x="1.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="9.5" y="1.5" width="5" height="3.5" rx=".5"/><rect x="5.5" y="11" width="5" height="3.5" rx=".5"/>' +
  '<path d="M4 5v3h8V5M8 8v3"/></svg>';
const TOGGLE = `<button type="button" class="gnuplot-toggle" aria-pressed="false" aria-label="Source view" title="Source view">${ICON_CODE}${ICON_GRAPH}</button>`;
const PLOT = '<div class="gnuplot-markdown-preview"><svg></svg></div>\n';
test('intercepts exactly gnuplot', () => {
  let seen = '';
  const md = markdownPlugin(new MarkdownIt(), source => {seen = source; return ok('<svg></svg>');});
  assert.match(md.render('```gnuplot\nplot sin(x)\n```'), /<svg>/);
  assert.equal(seen, 'plot sin(x)\n');
});
test('preserves unrelated fences byte for byte including highlighting and metadata', () => {
  for (const language of ['swift','javascript','python','','Gnuplot','gnuplot extra']) {
    const input = '```'+language+'\nlet x = "<hello>";\n```';
    const options = {highlight: () => '<b>highlight</b>'};
    assert.equal(markdownPlugin(new MarkdownIt(options), () => {throw Error('wrong fence');}).render(input), new MarkdownIt(options).render(input));
  }
});
test('missing fence renderer falls back without throwing', () => {
  const md = new MarkdownIt(); delete md.renderer.rules.fence;
  const expected = md.render('```swift\n42\n```');
  markdownPlugin(md, () => ok('<svg/>'));
  assert.equal(md.render('```swift\n42\n```'),expected);
});
// The DOM contract (docs/source-toggle-spec.md in onnx-markdown-preview, section 2): asserted
// exactly once, here.
test('every claimed fence is wrapped: toggle first, rendering slot, then the delegated source <pre>', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  assert.equal(md.render('```gnuplot\nplot x\n```'),
    `<div class="gnuplot-fence code-line" data-line="0" data-fence-key="2a14c550">${TOGGLE}` +
    `<div class="gnuplot-rendering">${PLOT}</div>` +
    '<pre><code class="language-gnuplot">plot x\n</code></pre>\n</div>\n');
});

test('the wrapper carries code-line and data-line from the token map, and neither without a map', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  const tokens = md.parse('# Title\n\n```gnuplot\nplot x\n```', {});
  assert.match(md.renderer.render(tokens, md.options, {}), /<div class="gnuplot-fence code-line" data-line="2" data-fence-key="2a14c550">/);
  for (const token of tokens) token.map = null;
  const bare = md.renderer.render(tokens, md.options, {});
  assert.match(bare, /<div class="gnuplot-fence" data-fence-key="2a14c550">/);
  assert.doesNotMatch(bare, /data-line/);
});

test('the fence key is FNV-1a of the exact body', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  assert.match(md.render('```gnuplot\nplot x\n```'), /data-fence-key="2a14c550"/);
  assert.match(md.render('```gnuplot\n```'), /data-fence-key="811c9dc5"/);
  // The info string and attributes play no part: same body, same key.
  assert.match(md.render('```gnuplot {caption="c" alt="a"}\nplot x\n```'), /data-fence-key="2a14c550"/);
  assert.match(md.render('```gnuplot\nplot x \n```'), /data-fence-key="407c082c"/);
});

test('the source <pre> is the delegated fence rule output, with VS Code-style highlighting kept verbatim', () => {
  const highlighted = markdownPlugin(new MarkdownIt({ highlight: (code, lang) => `<i class="${lang}">${code.trim()}</i>` }), () => ok('<svg></svg>'));
  assert.match(highlighted.render('```gnuplot {alt="x"}\nplot x\n```'), /<\/div><pre><code class="language-gnuplot"><i class="gnuplot">plot x<\/i><\/code><\/pre>\n<\/div>\n$/);
  // VS Code's shell keeps its highlighting and `dir`, but not the scroll-sync class and line,
  // which the wrapper carries for the whole fence.
  const vscode = new MarkdownIt();
  vscode.renderer.rules.fence = (tokens, index) =>
    `<pre><code data-line="${tokens[index]!.map![0]}" class="code-line language-gnuplot" dir="auto">${tokens[index]!.content}</code></pre>\n`;
  markdownPlugin(vscode, () => ok('<svg></svg>'));
  assert.match(vscode.render('```gnuplot\nplot x\n```'), /<\/div><pre><code class="language-gnuplot" dir="auto">plot x\n<\/code><\/pre>\n<\/div>\n$/);
  // Bare markdown-it with no fence rule at all: a hand-built, escaped fallback.
  const md = new MarkdownIt();
  delete md.renderer.rules.fence;
  markdownPlugin(md, () => ok('<svg></svg>'));
  assert.match(md.render('```gnuplot\nplot "<b>x</b>"\n```'), /<\/div><pre><code class="language-gnuplot">plot &quot;&lt;b&gt;x&lt;\/b&gt;&quot;\n<\/code><\/pre>\n<\/div>\n$/);
});

test('a previously registered fence renderer still receives its fences, and supplies the source view of ours', () => {
  const md = new MarkdownIt();
  md.renderer.rules.fence = () => '<div class="other-extension"></div>';
  markdownPlugin(md, () => ok('<svg></svg>'));
  assert.equal(md.render('```smiles\nCCO\n```'), '<div class="other-extension"></div>');
  const html = md.render('```gnuplot\nplot x\n```');
  assert.match(html, /<svg>/);
  assert.match(html, /<\/div><div class="other-extension"><\/div><\/div>\n$/);
});

test('an error card, a throwing renderer and the loading placeholder are wrapped like a plot', () => {
  const failed = markdownPlugin(new MarkdownIt(), () => ({ status: 'failure', message: 'bad' }));
  assert.equal(failed.render('```gnuplot\nplot x\n```'),
    `<div class="gnuplot-fence code-line" data-line="0" data-fence-key="2a14c550">${TOGGLE}` +
    '<div class="gnuplot-rendering"><div class="gnuplot-error" role="alert"><pre>Gnuplot error: bad</pre></div>\n</div>' +
    '<pre><code class="language-gnuplot">plot x\n</code></pre>\n</div>\n');
  const threw = markdownPlugin(new MarkdownIt(), () => { throw new Error('boom'); });
  assert.equal(threw.render('```gnuplot\nplot x\n```'),
    `<div class="gnuplot-fence code-line" data-line="0" data-fence-key="2a14c550">${TOGGLE}` +
    '<div class="gnuplot-rendering"><div class="gnuplot-error" role="alert"><pre>Gnuplot is unavailable: boom</pre></div>\n</div>' +
    '<pre><code class="language-gnuplot">plot x\n</code></pre>\n</div>\n');
  // The placeholder keeps going through `wrap`, so a caption still frames it.
  const loading = markdownPlugin(new MarkdownIt(), () => undefined);
  assert.equal(loading.render('```gnuplot {caption="Figure 1"}\nplot x\n```'),
    `<div class="gnuplot-fence code-line" data-line="0" data-fence-key="2a14c550">${TOGGLE}` +
    '<div class="gnuplot-rendering"><figure class="gnuplot-markdown-preview"><p role="status">Loading gnuplot plot…</p><figcaption>Figure 1</figcaption></figure>\n</div>' +
    '<pre><code class="language-gnuplot">plot x\n</code></pre>\n</div>\n');
});

test('a slot caches only the rendering: an edited fence keeps the old plot but shows its new body in source view', () => {
  let next: RenderResult | undefined = ok('<svg>old</svg>');
  const md = markdownPlugin(new MarkdownIt(), () => next);
  const env = { currentDocument: { toString: () => 'a.md' } };
  md.render('```gnuplot\nplot x\n```', env);
  next = undefined;
  assert.equal(md.render('```gnuplot\nplot x + 1\n```', env),
    `<div class="gnuplot-fence code-line" data-line="0" data-fence-key="48e5ddfa">${TOGGLE}` +
    '<div class="gnuplot-rendering"><div class="gnuplot-markdown-preview"><svg>old</svg></div>\n</div>' +
    '<pre><code class="language-gnuplot">plot x + 1\n</code></pre>\n</div>\n');
});

test('errors are localized and escaped', () => {
  const md = markdownPlugin(new MarkdownIt(), () => {throw Error('<script> & "bad"');});
  const html = md.render('# Before\n```gnuplot\nbad\n```\nAfter');
  assert.match(html, /gnuplot-error/); assert.match(html,/&lt;script&gt; &amp;/);
  assert.match(html, /<p>After<\/p>/); assert.doesNotMatch(html, /<script>/);
});

test('fence attributes add an accessible name and a plain-text figure caption', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  const html = md.render('```gnuplot {alt="Sine curve" caption="Figure 1"}\nplot sin(x)\n```');
  assert.match(html, /<figure class="gnuplot-markdown-preview">/);
  assert.match(html, /<div role="img" aria-label="Sine curve"><svg>/);
  assert.match(html, /<figcaption>Figure 1<\/figcaption><\/figure>/);
  assert.match(md.render("```gnuplot {caption='It works' alt='curve'}\nplot x\n```"), /aria-label="curve"/);
  assert.match(md.render('```gnuplot {alt="curve"}\nplot x\n```'), /role="img"/);
  assert.doesNotMatch(md.render('```gnuplot {caption="curve"}\nplot x\n```'), /role="img"/);
});

test('attribute text is escaped, including quotes, markup and Markdown', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  const html = md.render('```gnuplot {alt=\'" onmouseover="bad <tag> &\' caption="<script> & **plain**"}\nplot x\n```');
  assert.match(html, /aria-label="&quot; onmouseover=&quot;bad &lt;tag&gt; &amp;"/);
  assert.match(html, /<figcaption>&lt;script&gt; &amp; \*\*plain\*\*<\/figcaption>/);
  assert.doesNotMatch(html, /<script>|<strong>| onmouseover="/);
  assert.match(md.render('```gnuplot {caption="A \\"quote\\" and \\\\ path"}\nplot x\n```'), /A &quot;quote&quot; and \\ path/);
});

test('malformed and unsupported attributes never prevent plotting', () => {
  let calls = 0;
  const md = markdownPlugin(new MarkdownIt(), () => { calls++; return ok('<svg></svg>'); });
  for (const attributes of ['{alt=unquoted}', '{alt="a" alt="b"}', '{width="400"}', '{caption="x"} junk', '{alt="x"', '{alt="x"caption="y"}']) {
    const html = md.render('Before\n\n```gnuplot '+attributes+'\nplot x\n```\n\nAfter');
    assert.doesNotMatch(html, /gnuplot-error/); assert.match(html, /<svg>/);
    assert.match(html, /<p>After<\/p>/);
  }
  assert.equal(calls, 6);
});

test('valid attributes survive unknown, malformed and duplicate fields', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ok('<svg></svg>'));
  const html = md.render('```gnuplot {width="400" alt=bad caption="Good" alt="First" alt="Second" onclick="evil"}\nplot x\n```');
  assert.match(html, /<figcaption>Good<\/figcaption>/);
  assert.match(html, /aria-label="First"/);
  assert.doesNotMatch(html, /Second|onclick|evil|gnuplot-error/);
  const broken = md.render('```gnuplot {unknown="unterminated caption=\'hidden\'}\nplot x\n```');
  // Scoped to the rendering slot: the toggle's glyphs carry `aria-hidden`.
  assert.match(broken, /<svg>/); assert.doesNotMatch(rendering(broken), /figcaption|hidden|gnuplot-error/);
});

test('loading status remains accessible and empty attributes are accepted', () => {
  const md = markdownPlugin(new MarkdownIt(), () => undefined);
  const html = md.render('```gnuplot {alt="curve" caption=""}\nplot x\n```');
  assert.match(html, /role="status"/); assert.doesNotMatch(html, /role="img"/);
  assert.match(md.render('```gnuplot {}\nplot x\n```'), /Loading/);
});

test('library results become escaped error blocks with their position', () => {
  const results: RenderResult[] = [
    { status: 'failure', message: 'invalid <command> & "x"', line: 2, column: 5 },
    { status: 'failure', message: 'only a line', line: 3 },
    { status: 'failure', message: 'nowhere' },
    { status: 'timeout', budget: 3000 },
    { status: 'unavailable', reason: 'engine <gone>' }
  ];
  let next = 0;
  const md = markdownPlugin(new MarkdownIt(), () => results[next++]);
  const html = results.map(() => md.render('```gnuplot\nplot x\n```')).join('');
  assert.match(html, /Gnuplot error at line 2, column 5: invalid &lt;command&gt; &amp; &quot;x&quot;/);
  assert.match(html, /Gnuplot error at line 3: only a line/);
  assert.match(html, /Gnuplot error: nowhere/);
  assert.match(html, /took longer than 3000 ms[^<]*Refresh Data/);
  assert.match(html, /Gnuplot is unavailable: engine &lt;gone&gt;/);
  assert.equal(html.match(/<div class="gnuplot-error" role="alert">/g)!.length, 5);
});

test('notes are escaped above the plot', () => {
  const md = markdownPlugin(new MarkdownIt(), () => ({ status: 'success', output: '<svg></svg>', notes: ['<b>one</b>', 'two'] }));
  assert.equal(rendering(md.render('```gnuplot\nplot x\n```')), '<div class="gnuplot-notes">&lt;b&gt;one&lt;/b&gt;<br>two</div>' + PLOT);
});

test('a throwing render degrades its fence alone and is reported', () => {
  const reported: string[] = [];
  const md = markdownPlugin(new MarkdownIt(), () => { throw new Error('bad <input>'); }, (message) => reported.push(message));
  const html = md.render('```gnuplot\nplot x\n```\n\nAfter');
  assert.match(html, /Gnuplot is unavailable: bad &lt;input&gt;/);
  assert.match(html, /<p>After<\/p>/);
  assert.deepEqual(reported, ['Gnuplot render failed: bad <input>']);
});

test('a fence being prepared keeps showing what its slot last showed', () => {
  let result: RenderResult | undefined = ok('<svg>first</svg>');
  const md = markdownPlugin(new MarkdownIt(), (source) => source.includes('second') ? ok('<svg>second</svg>') : result);
  const a = { currentDocument: 'file:///a.md' };
  const b = { currentDocument: 'file:///b.md' };
  const page = (first: string) => '```gnuplot\n' + first + '\n```\n\n```gnuplot\nsecond\n```';
  assert.match(md.render(page('plot x'), a), /<svg>first<\/svg>/);
  result = undefined;
  // Editing the first fence: it keeps its previous plot, and the second fence is unaffected.
  const editing = md.render(page('plot x + 1'), a);
  assert.match(editing, /<svg>first<\/svg>[^]*<svg>second<\/svg>/);
  assert.doesNotMatch(editing, /Loading/);
  // The same slot in another document has never been drawn.
  assert.match(md.render(page('plot x + 1'), b), /Loading gnuplot plot/);
  // Nor has any fence rendered without a document.
  assert.match(md.render(page('plot x + 1')), /Loading gnuplot plot/);
  // Once ready, the new result replaces the remembered one.
  result = ok('<svg>third</svg>');
  assert.match(md.render(page('plot x + 1'), a), /<svg>third<\/svg>/);
});
