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
