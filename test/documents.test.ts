import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as library from '@reonarudo/gnuplot-renderer';
import type { FileReader, Prepared } from '@reonarudo/gnuplot-renderer';

const compiled = buildSync({
  entryPoints: ['src/documents.ts'], bundle: true, platform: 'node', format: 'cjs',
  external: ['vscode', '@reonarudo/gnuplot-renderer'], write: false
}).outputFiles[0]!.text;
class Uri {
  constructor(readonly fsPath: string, readonly scheme = 'file') {}
  toString() { return this.scheme + ':' + this.fsPath; }
  static file(path: string) { return new Uri(path); }
}
const settle = async (documents: { prepare(source: string, env: unknown): Prepared | string | undefined }, source: string, env: unknown) => {
  for (let i = 0; i < 100; i++) {
    const prepared = documents.prepare(source, env);
    if (prepared !== undefined) return prepared;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('never prepared');
};

test('the adapter applies the editor rules, reads through the library, and discards stale loads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnuplot-coordinator-'));
  await mkdir(join(root, 'a'));
  const file = join(root, 'a/data.csv');
  await writeFile(file, '0,1\n1,2\n');
  await writeFile(join(root, 'secret.csv'), '0,1\n');
  let reads = 0, refreshes = 0;
  const counted: typeof library = {
    ...library,
    nodeFileReader: (options) => {
      const reader = library.nodeFileReader(options);
      return { read: (key, limits) => { reads++; return reader.read(key, limits); } } satisfies FileReader;
    }
  };
  const callbacks = new Map<string, (arg: unknown) => void>();
  const event = (name: string) => (cb: (arg: unknown) => void) => { callbacks.set(name, cb); return { dispose() {} }; };
  const workspace = {
    isTrusted: false, getWorkspaceFolder: () => ({ uri: new Uri(root) }),
    createFileSystemWatcher: () => ({ onDidChange: event('change'), onDidCreate: event('create'), onDidDelete: event('delete'), dispose() {} }),
    onDidRenameFiles: event('rename'), onDidSaveTextDocument: event('save'), onDidCloseTextDocument: event('close'),
    onDidChangeWorkspaceFolders: event('folders'), onDidGrantWorkspaceTrust: event('trust')
  };
  type Documents = { prepare(source: string, env: unknown): Prepared | string | undefined; clear(): void; dispose(): void };
  const module: { exports: { DocumentData?: new (library: unknown) => Documents } } = { exports: {} };
  const nativeRequire = createRequire(import.meta.url);
  runInNewContext(compiled, {
    exports: module.exports, module, setTimeout, clearTimeout, console, Buffer,
    require: (id: string) => id === 'vscode'
      ? { workspace, Uri, commands: { executeCommand: async () => { refreshes++; } } }
      : nativeRequire(id)
  });
  const documents = new module.exports.DocumentData!(counted);
  const env = { currentDocument: new Uri(join(root, 'a/demo.md')) };
  const source = 'set datafile separator comma\nplot "data.csv"';
  const failure = (prepared: Prepared | string) => typeof prepared === 'string' ? prepared : prepared.failure?.message;
  try {
    // Restricted Mode: plots without data render, data is refused without reading.
    assert.equal((await settle(documents, 'plot sin(x)', env) as Prepared).failure, undefined);
    assert.match(failure(await settle(documents, source, env))!, /cannot load data file "data.csv": external data requires a trusted workspace/);
    assert.equal(reads, 0);

    workspace.isTrusted = true;
    callbacks.get('trust')!(undefined);
    documents.clear();
    assert.match(failure(await settle(documents, source, { currentDocument: new Uri('/demo.md', 'vscode-remote') }))!, /local file workspace/);
    assert.match(failure(await settle(documents, source, undefined))!, /save this Markdown document/);
    assert.match(failure(await settle(documents, 'plot "../../secret.csv"', env))!, /outside this document’s workspace folder/);
    assert.equal(reads, 1);

    // Invalidate while the first load is still pending: its result must not repopulate the cache.
    assert.equal(documents.prepare(source, env), undefined);
    callbacks.get('change')!(new Uri(file));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const prepared = await settle(documents, source, env) as Prepared;
    assert.equal(prepared.failure, undefined);
    assert.equal(prepared.files[0]!.label, 'data.csv');
    assert.equal(reads, 3);
    assert.equal(documents.prepare(source, env), prepared, 'cached');

    // A missing file is watched too, so recreating it re-prepares the fence.
    await rm(file);
    callbacks.get('delete')!(new Uri(file));
    assert.match(failure(await settle(documents, source, env))!, /file not found/);
    await writeFile(file, '0,1\n');
    callbacks.get('create')!(new Uri(file));
    assert.equal((await settle(documents, source, env) as Prepared).failure, undefined);

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert(refreshes > 0);
    const count = refreshes;
    documents.dispose();
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(refreshes, count);
  } finally {
    documents.dispose();
    await rm(root, { recursive: true, force: true });
  }
});
