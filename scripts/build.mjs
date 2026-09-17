import { build } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/extension.ts','src/worker.ts'], outdir:'dist', bundle:true, platform:'node', target:'node20', format:'cjs', external:['vscode'], sourcemap:false});
for (const file of ['gnuplot.mjs','gnuplot.wasm']) await copyFile(`vendor/gnuplot/${file}`, `dist/${file}`);
const adapter = await readFile('dist/gnuplot.mjs','utf8');
if (/child_process|spawnSync|(?:var|const|let)\s+(?:NODEFS|NODERAWFS)\s*=/.test(adapter)) throw new Error('Forbidden host bridge in WASM adapter');
