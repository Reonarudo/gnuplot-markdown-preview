import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import { createRuntime, prepare, type FileReader, type RenderResult, type Runtime } from '@reonarudo/gnuplot-renderer';
import { markdownPlugin } from '../src/markdown';
import { rendering } from './helpers';

// These run the real library, to pin the glue's assumptions about its output. Rendering itself
// is gnuplot-renderer's to test.

let runtime: Runtime;
before(async () => { runtime = await createRuntime(); });
after(async () => { await runtime.dispose(); });

const files: Record<string, string> = { 'data/<a>.csv': '0,1\n1,2\n2,4\n' };
const reader: FileReader = {
  read: async (key) => key in files ? { bytes: new TextEncoder().encode(files[key]) } : { error: 'file not found' }
};
/** Prepare every gnuplot fence first, then render the page synchronously, as the preview does. */
async function page(markdown: string): Promise<string> {
  const results = new Map<string, RenderResult>();
  for (const token of new MarkdownIt().parse(markdown, {})) {
    if (token.type === 'fence' && token.info.startsWith('gnuplot')) {
      results.set(token.content, runtime.render(await prepare(token.content, { reader })));
    }
  }
  return markdownPlugin(new MarkdownIt(), (source) => results.get(source)).render(markdown);
}

test('a plot is wrapped with its alt text and caption', async () => {
  const html = await page('```gnuplot {alt="Sine <curve>" caption="Figure & 1"}\nplot sin(x)\n```');
  assert.match(rendering(html), /^<figure class="gnuplot-markdown-preview"><div role="img" aria-label="Sine &lt;curve&gt;"><svg [^>]*class="gnuplot"/);
  assert.match(html, /<figcaption>Figure &amp; 1<\/figcaption><\/figure>/);
});

test('a data file plots, and a missing one fails at its operand with the name the author wrote', async () => {
  const html = await page('```gnuplot\nset datafile separator comma\nplot "data/<a>.csv" using 1:2\n```\n```gnuplot\nplot sin(x), \\\n  "missing.csv"\n```');
  assert.match(html, /<svg [^>]*class="gnuplot"/);
  assert.match(html, /Gnuplot error at line 2, column 3: cannot load data file &quot;missing.csv&quot;: file not found/);
});

test('author text in an error or print output stays text', async () => {
  const html = await page('```gnuplot\nprint "<img src=x onerror=alert(1)>"\nplot x\n```\n```gnuplot\nplot x\n<script>alert(1)</script>\n```');
  assert.match(html, /<div class="gnuplot-notes">&lt;img src=x onerror=alert\(1\)&gt;<\/div>/);
  assert.match(html, /Gnuplot error at line 2/);
  assert.doesNotMatch(html, /<img|<script/);
});
