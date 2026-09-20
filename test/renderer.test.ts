import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime, createRenderer } from '../src/renderer';
const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path id="p"/><use href="#p"/></svg>';
test('bounded LRU cache avoids repeated execution and isolates IDs', () => {
  let calls = 0;
  const render = createRenderer({render: () => { calls++; return svg; }},2);
  assert.notEqual(render('a'), render('a')); assert.equal(calls,1);
  render('b');render('a');render('c');render('b');assert.equal(calls,4);
});
test('cached errors stay useful', () => {
  let calls=0;const render=createRenderer({render:()=>{calls++;throw Error('invalid');}});
  assert.throws(()=>render('bad'),/invalid/);assert.throws(()=>render('bad'),/invalid/);assert.equal(calls,1);
});
test('real WASM: functions, datasets, 3D, isolation, errors, sandbox', async () => {
  const runtime = await createRuntime(resolve('dist'));
  try {
    const render = createRenderer(runtime);
    for (const source of ['plot sin(x)','set xrange [-10:10]\nplot sin(x), cos(x), atan(x)', '$data << EOD\n0 0\n1 1\n2 4\nEOD\nplot $data using 1:2 with linespoints','set hidden3d\nsplot sin(sqrt(x*x+y*y))']) {
      const output = render(source); assert.match(output, /<svg/);assert.match(output,/<\/svg>/);
    }
    assert.throws(()=>render('this is invalid gnuplot'),/invalid|command/i);
    assert.throws(()=>render('set terminal dumb\nplot x'),/controls terminal/);
    assert.throws(()=>render('set output "x"\nplot x'),/controls terminal/);
    assert.throws(()=>render('plot "/etc/passwd"'),/files|Cannot|cannot|valid|open/i);
    const marker='/tmp/gnuplot-preview-shell-must-not-run';
    for (const source of [`system "touch ${marker}"\nplot x`, `!touch ${marker}\nplot x`, `a=system("touch ${marker}")\nplot x`, 'plot "<echo 1 2"']) {
      try { runtime.render(source); } catch { /* Unsupported shell operations may error. */ }
      assert.equal(existsSync(marker),false);
    }
    assert.match(render('plot cos(x)'),/<svg/);
    assert.throws(()=>render('plot $data'),/defined|invalid|data|plot/i);
  } finally {runtime.dispose();}
});
test('generated adapter contains no host process or filesystem bridge', () => {
  assert.doesNotMatch(readFileSync('dist/gnuplot.mjs','utf8'), /child_process|spawnSync|(?:var|const|let)\s+(?:NODEFS|NODERAWFS)\s*=/);
});
test('infinite loops terminate within the render budget', async () => {
  const runtime=await createRuntime(resolve('dist'),200);
  try {assert.throws(()=>runtime.render('while (1) {}'),/time limit/);assert.throws(()=>runtime.render('plot x'),/stopped/);}
  finally {runtime.dispose();}
});
test('quoted output-command text is a legitimate label', async () => {
  const runtime=await createRuntime(resolve('dist'));
  try {assert.match(runtime.render('set title "set terminal is unnecessary"\nplot x'),/<svg/);}
  finally {runtime.dispose();}
});

test('ready worker survives extension-host event-loop starvation during initialization', async () => {
  const pending = createRuntime(resolve('dist'));
  // Other extensions can block the host while this worker initializes independently.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_500);
  const runtime = await pending;
  try { assert.match(runtime.render('plot sin(x)'), /<svg/); }
  finally { runtime.dispose(); }
});

for (const [name, worker, message] of [
  ['early worker exit', 'process.exit(7)', /worker exited during initialization \(code 7\)/],
  ['unresponsive worker', 'setInterval(() => {}, 1000)', /initialization timed out/],
] as const) {
  test(`startup reports ${name} and cleans up`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gnuplot-startup-'));
    try {
      await writeFile(join(directory, 'worker.js'), worker);
      await assert.rejects(createRuntime(directory), message);
    } finally { await rm(directory, {recursive: true, force: true}); }
  });
}
