import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { sanitizeSvg, namespaceSvg } from './sanitizer';
const capacity = 4_000_000;
export interface PlotRuntime { render(source: string): string; dispose(): void; }
export async function createRuntime(directory: string, timeout = 3000): Promise<PlotRuntime> {
  const buffer = new SharedArrayBuffer(capacity + 8);
  const state = new Int32Array(buffer, 0, 2);
  const bytes = new Uint8Array(buffer, 8);
  const worker = new Worker(join(directory, 'worker.js'), {workerData: {buffer, directory}, env: {}, resourceLimits: {maxOldGenerationSizeMb: 128}});
  let stopped = false;
  const stop = (): void => { stopped = true; void worker.terminate(); };
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error('Gnuplot initialization timed out.')); }, 10000);
    worker.once('message', (message: {ready?: boolean; error?: string}) => {
      clearTimeout(timer);
      if (message.ready) resolve();
      else { stop(); reject(new Error(message.error ?? 'Gnuplot initialization failed.')); }
    });
    worker.once('error', (error) => { clearTimeout(timer); stopped = true; reject(error); });
    worker.once('exit', () => { stopped = true; });
  });
  return {
    render(source) {
      if (stopped) throw new Error('Gnuplot runtime stopped. Reload the VS Code window to resume rendering.');
      Atomics.store(state, 0, 0);
      worker.postMessage(source);
      const status = Atomics.wait(state, 0, 0, timeout);
      if (status === 'timed-out') { stop(); throw new Error('Gnuplot exceeded the render time limit. Reload the VS Code window to resume rendering.'); }
      const result = new TextDecoder().decode(bytes.subarray(0, Atomics.load(state, 1)));
      if (Atomics.load(state, 0) !== 1) throw new Error(result);
      return result;
    },
    dispose: stop,
  };
}
export function createRenderer(runtime: Pick<PlotRuntime, 'render'>, maxEntries = 96): (source: string) => string {
  const cache = new Map<string, {svg?: string; error?: string}>();
  const session = randomBytes(6).toString('hex');
  let occurrence = 0;
  return (source) => {
    if (source.length > 64_000) throw new Error('Gnuplot source exceeds the 64 KB limit.');
    let result = cache.get(source);
    if (result) cache.delete(source);
    else {
      try { result = {svg: sanitizeSvg(runtime.render(source))}; }
      catch (error) { result = {error: error instanceof Error ? error.message : 'Gnuplot rendering failed.'}; }
    }
    cache.set(source, result);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
    if (result.error !== undefined) throw new Error(result.error);
    return namespaceSvg(result.svg!, `gp-${session}-${++occurrence}-`);
  };
}
