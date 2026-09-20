import { parentPort, workerData } from 'node:worker_threads';
import { checkOutputPolicy } from './policy';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { RenderInput } from './renderer';
import { MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from './dataLoader';
interface FileSystem {
  ErrnoError: new (errno: number) => Error;
  init(input: () => null, output: null, error: null): void;
  mkdir(path: string): void;
  chdir(path: string): void;
  writeFile(path: string, data: string | Uint8Array): void;
  readFile(path: string, options: {encoding: 'utf8'}): string;
  unlink(path: string): void;
  open(path: string, flags: string | number, mode?: number): unknown;
}
interface Module {
  FS: FileSystem;
  HEAPU8: Uint8Array;
  callMain(args: string[]): number;
}
interface Factory { default(options: Record<string, unknown>): Promise<Module>; }
const {buffer, directory} = workerData as {buffer: SharedArrayBuffer; directory: string};
const state = new Int32Array(buffer, 0, 3);
const bytes = new Uint8Array(buffer, 12);
async function main(): Promise<void> {
  const factory = await import(pathToFileURL(join(directory, 'gnuplot.mjs')).href) as Factory;
  let diagnostics = '';
  const log = (line: string): void => { if (diagnostics.length < 16000) diagnostics += `${line}\n`; };
  const instance = await factory.default({
    wasmBinary: await readFile(join(directory, 'gnuplot.wasm')),
    noInitialRun: true, noFSInit: true, print: log, printErr: log,
  });
  const fs = instance.FS;
  fs.init(() => null, null, null);
  fs.mkdir('/work');
  fs.chdir('/work');
  // No NODEFS is linked. Only explicit in-memory data snapshots can be read.
  const open = fs.open.bind(fs);
  const dataNames=new Set<string>();
  let mounting=false;
  fs.open = (path, flags, mode) => {
    const name=path.startsWith('/work/')?path.slice(6):path;
    const reading=typeof flags==='number'?(flags&3)===0 && (flags& (64|512|1024))===0:flags==='r';
    if (!(name==='plot.svg' || name==='script.gp' && (mounting || reading) || dataNames.has(name) && (mounting || reading))) {
      throw new fs.ErrnoError(44);
    }
    return open(path, flags, mode);
  };
  const snapshot = Uint8Array.from(instance.HEAPU8);
  parentPort!.on('message', (request: string | RenderInput) => {
    let result: string;
    let success = false;
    diagnostics = '';
    try {
      const {source,files=[]}=typeof request==='string'?{source:request}:request;
      if(files.length>MAX_FILES || files.reduce((n,f)=>n+f.bytes.length,0)>MAX_TOTAL_BYTES)throw new Error('Plot data exceeds input limits.');
      mounting=true;
      for(const file of files){
        if(!/^data-\d+\.dat$/.test(file.name) || dataNames.has(file.name) || file.bytes.length>MAX_FILE_BYTES)throw new Error('Invalid plot data snapshot.');
        dataNames.add(file.name);fs.writeFile(file.name,file.bytes);
      }
      // Output belongs to the preview. This is policy, not the security boundary:
      // the adapter has no shell bridge and its filesystem is memory-only.
      checkOutputPolicy(source);
      fs.writeFile('script.gp', `set terminal svg size 1000,500 enhanced background rgb 'white'\nset output 'plot.svg'\n${source}\n`);
      mounting=false;
      const exit = instance.callMain(['script.gp']);
      if (exit !== 0) throw new Error(diagnostics.trim() || 'Gnuplot rejected this program.');
      result = fs.readFile('plot.svg', {encoding: 'utf8'});
      if (!result.includes('</svg>')) throw new Error(diagnostics.trim() || 'Gnuplot did not produce a complete SVG plot.');
      success = true;
    } catch (error) {
      result = error instanceof Error ? error.message : diagnostics.trim() || 'Gnuplot rendering failed.';
    } finally {
      mounting=false;
      for (const path of ['script.gp', 'plot.svg',...dataNames]) { try { fs.unlink(path); } catch { /* File may not exist after failure. */ } }
      dataNames.clear();
      instance.HEAPU8.set(snapshot);
    }
    let encoded = new TextEncoder().encode(result);
    if (encoded.length > bytes.length) { encoded = new TextEncoder().encode('Gnuplot output exceeds the 4 MB limit.'); success = false; }
    bytes.set(encoded);
    Atomics.store(state, 1, encoded.length);
    Atomics.store(state, 0, success ? 1 : 2);
    Atomics.notify(state, 0);
  });
  Atomics.store(state, 2, 1);
  parentPort!.postMessage({ready: true});
}
void main().catch((error: unknown) => parentPort!.postMessage({error: error instanceof Error ? error.message : 'WASM initialization failed.'}));
