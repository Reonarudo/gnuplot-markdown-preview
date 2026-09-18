import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const local=JSON.parse(await readFile('package.json','utf8'));
const file = resolve(process.argv[2] || `gnuplot-markdown-preview-${local.version}.vsix`);
const temp = await mkdtemp(join(tmpdir(),'gnuplot-vsix-'));
try {
  execFileSync('unzip',['-q',file,'-d',temp]);
  const root = join(temp,'extension');
  for (const path of ['dist/extension.js','dist/worker.js','dist/gnuplot.mjs','dist/gnuplot.wasm','readme.md','LICENSE.txt','THIRD_PARTY_NOTICES.md','media/icon.png','vendor/gnuplot/Copyright','vendor/gnuplot/SOURCE-NOTICES.txt']) assert.ok((await readFile(join(root,path))).length>0,path);
  const manifest = JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  assert.equal(manifest.publisher,'ReoX86');assert.equal(manifest.version,local.version);
  execFileSync(process.execPath,['scripts/test-extension.mjs'],{stdio:'inherit',env:{...process.env,GNUPLOT_EXTENSION_PATH:root}});
  console.log('Packaged extension layout and real extension-host rendering: PASS');
} finally {await rm(temp,{recursive:true,force:true});}
