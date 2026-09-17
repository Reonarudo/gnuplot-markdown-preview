import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import MarkdownIt from 'markdown-it';
const require = createRequire(import.meta.url);
const file = resolve(process.argv[2] || 'gnuplot-markdown-preview-0.1.0.vsix');
const temp = await mkdtemp(join(tmpdir(),'gnuplot-vsix-'));
const subscriptions = [];
try {
  execFileSync('unzip',['-q',file,'-d',temp]);
  const root = join(temp,'extension');
  for (const path of ['dist/extension.js','dist/worker.js','dist/gnuplot.mjs','dist/gnuplot.wasm','readme.md','LICENSE.txt','THIRD_PARTY_NOTICES.md','media/icon.png','vendor/gnuplot/Copyright','vendor/gnuplot/SOURCE-NOTICES.txt']) assert.ok((await readFile(join(root,path))).length>0,path);
  const manifest = JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  assert.equal(manifest.publisher,'ReoX86');assert.equal(manifest.version,'0.1.0');
  const api=await require(join(root,'dist/extension.js')).activate({asAbsolutePath:p=>join(root,p),subscriptions});
  const md=api.extendMarkdownIt(new MarkdownIt());
  const html=md.render(await readFile('examples/demo.md','utf8'));
  assert.equal((html.match(/<svg\b/g)||[]).length,4);
  assert.equal((html.match(/class="gnuplot-error"/g)||[]).length,1);
  assert.match(html,/language-swift/);assert.match(html,/language-javascript/);
  const repeated=md.render('```gnuplot\nplot sin(x)\n```\n```gnuplot\nplot sin(x)\n```');
  const ids=[...repeated.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length);
  console.log('Packaged extension: 4 SVG plots, 1 localized error, unrelated fences, unique cached IDs: PASS');
} finally {for (const item of subscriptions)item.dispose();await rm(temp,{recursive:true,force:true});}
