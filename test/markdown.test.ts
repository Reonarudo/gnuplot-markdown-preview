import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import type { RenderResult } from '@reonarudo/gnuplot-renderer';
import { markdownPlugin } from '../src/markdown';
const ok = (output: string): RenderResult => ({ status: 'success', output, notes: [] });
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
  assert.match(broken, /<svg>/); assert.doesNotMatch(broken, /figcaption|hidden|gnuplot-error/);
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
  assert.match(md.render('```gnuplot\nplot x\n```'), /^<div class="gnuplot-notes">&lt;b&gt;one&lt;\/b&gt;<br>two<\/div><div class="gnuplot-markdown-preview"><svg>/);
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
