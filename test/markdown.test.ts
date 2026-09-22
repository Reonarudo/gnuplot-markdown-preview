import { test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { markdownPlugin } from '../src/markdown';
test('intercepts exactly gnuplot', () => {
  let seen = '';
  const md = markdownPlugin(new MarkdownIt(), source => {seen = source; return '<svg></svg>';});
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
  markdownPlugin(md, () => '<svg/>');
  assert.equal(md.render('```swift\n42\n```'),expected);
});
test('errors are localized and escaped', () => {
  const md = markdownPlugin(new MarkdownIt(), () => {throw Error('<script> & "bad"');});
  const html = md.render('# Before\n```gnuplot\nbad\n```\nAfter');
  assert.match(html, /gnuplot-error/); assert.match(html,/&lt;script&gt; &amp;/);
  assert.match(html, /<p>After<\/p>/); assert.doesNotMatch(html, /<script>/);
});

test('fence attributes add an accessible name and a plain-text figure caption', () => {
  const md = markdownPlugin(new MarkdownIt(), () => '<svg></svg>');
  const html = md.render('```gnuplot {alt="Sine curve" caption="Figure 1"}\nplot sin(x)\n```');
  assert.match(html, /<figure class="gnuplot-markdown-preview">/);
  assert.match(html, /<div role="img" aria-label="Sine curve"><svg>/);
  assert.match(html, /<figcaption>Figure 1<\/figcaption><\/figure>/);
  assert.match(md.render("```gnuplot {caption='It works' alt='curve'}\nplot x\n```"), /aria-label="curve"/);
  assert.match(md.render('```gnuplot {alt="curve"}\nplot x\n```'), /role="img"/);
  assert.doesNotMatch(md.render('```gnuplot {caption="curve"}\nplot x\n```'), /role="img"/);
});

test('attribute text is escaped, including quotes, markup and Markdown', () => {
  const md = markdownPlugin(new MarkdownIt(), () => '<svg></svg>');
  const html = md.render('```gnuplot {alt=\'" onmouseover="bad <tag> &\' caption="<script> & **plain**"}\nplot x\n```');
  assert.match(html, /aria-label="&quot; onmouseover=&quot;bad &lt;tag&gt; &amp;"/);
  assert.match(html, /<figcaption>&lt;script&gt; &amp; \*\*plain\*\*<\/figcaption>/);
  assert.doesNotMatch(html, /<script>|<strong>| onmouseover="/);
  assert.match(md.render('```gnuplot {caption="A \\"quote\\" and \\\\ path"}\nplot x\n```'), /A &quot;quote&quot; and \\ path/);
});

test('malformed and unsupported attributes fail locally without executing a plot', () => {
  const md = markdownPlugin(new MarkdownIt(), () => { throw Error('renderer called'); });
  for (const attributes of ['{alt=unquoted}', '{alt="a" alt="b"}', '{width="400"}', '{caption="x"} junk', '{alt="x"', '{alt="x"caption="y"}']) {
    const html = md.render('Before\n\n```gnuplot '+attributes+'\nplot x\n```\n\nAfter');
    assert.match(html, /gnuplot-error/); assert.doesNotMatch(html, /renderer called/);
    assert.match(html, /<p>After<\/p>/);
  }
});

test('loading status remains accessible and empty attributes are accepted', () => {
  const md = markdownPlugin(new MarkdownIt(), () => '<p role="status">Loading</p>');
  const html = md.render('```gnuplot {alt="curve" caption=""}\nplot x\n```');
  assert.match(html, /role="status"/); assert.doesNotMatch(html, /role="img"/);
  assert.match(md.render('```gnuplot {}\nplot x\n```'), /Loading/);
});
