import * as vscode from 'vscode';
import { dirname, resolve, sep } from 'node:path';
import type { FileReader, Prepared } from '@reonarudo/gnuplot-renderer';

/** What this module needs from gnuplot-renderer, passed in because the library is loaded at activation. */
export interface Library {
  prepare: typeof import('@reonarudo/gnuplot-renderer').prepare;
  nodeFileReader: typeof import('@reonarudo/gnuplot-renderer').nodeFileReader;
}

interface Entry {
  readonly document: string;
  /** Absolute paths of every data file the reader was asked for, found or not, so a watcher event can invalidate the entry. */
  readonly paths: Set<string>;
  bytes: number;
  prepared?: Prepared;
  error?: string;
}

const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 512;
const MAX_PENDING = 8;

/** A reader that refuses every file with one reason; plots that name no data files never call it. */
const refuse = (error: string): FileReader => ({ read: async () => ({ error }) });

/**
 * The VS Code file reader adapter (ADR 0002 decision 5). The editor-only rules decide whether files
 * may be read at all; reading itself, with containment, symlink, size and change checks, is the
 * library's `nodeFileReader` rooted at the document's workspace folder.
 */
function readerFor(library: Library, document: vscode.Uri | undefined, record: (path: string) => void): FileReader {
  if (!vscode.workspace.isTrusted) {
    return refuse('external data requires a trusted workspace; plots of functions and inline data still render');
  }
  if (!document || document.scheme === 'untitled') {
    return refuse('save this Markdown document inside a workspace folder to use data files');
  }
  const folder = vscode.workspace.getWorkspaceFolder(document)?.uri;
  if (!folder) return refuse('open this Markdown document’s folder as a workspace to use data files');
  if (document.scheme !== 'file' || folder.scheme !== 'file') {
    return refuse('external data needs a local file workspace; inline data still works here');
  }
  const reader = library.nodeFileReader({ root: folder.fsPath, document: document.fsPath });
  return {
    async read(key, options) {
      record(resolve(dirname(document.fsPath), key));
      const result = await reader.read(key, options);
      // The library's wording is about a site's content root; here the root is the workspace folder.
      return 'error' in result && result.error === 'the file is outside the content root'
        ? { error: 'the file is outside this document’s workspace folder' }
        : result;
    }
  };
}

function currentDocument(env: unknown): vscode.Uri | undefined {
  const candidate = (env as { currentDocument?: unknown } | undefined)?.currentDocument;
  return candidate instanceof vscode.Uri ? candidate : undefined;
}

/**
 * Prepared render inputs per document and fence body. `prepare` is asynchronous and the fence rule
 * is not (ADR 0010 decision 4): a fence seen for the first time starts preparing and is reported
 * as not ready, and the preview is refreshed once it settles.
 */
export class DocumentData implements vscode.Disposable {
  private readonly entries = new Map<string, Entry>();
  private readonly subscriptions: vscode.Disposable[] = [];
  private bytes = 0;
  private pending = 0;
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly library: Library) {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');
    const changed = (uri: vscode.Uri): void => this.invalidate(uri);
    this.subscriptions.push(
      watcher, watcher.onDidChange(changed), watcher.onDidCreate(changed), watcher.onDidDelete(changed),
      vscode.workspace.onDidRenameFiles((event) => { for (const file of event.files) { changed(file.oldUri); changed(file.newUri); } }),
      vscode.workspace.onDidSaveTextDocument((document) => changed(document.uri)),
      vscode.workspace.onDidCloseTextDocument((document) => {
        for (const [key, entry] of this.entries) if (entry.document === document.uri.toString()) this.remove(key);
      }),
      vscode.workspace.onDidChangeWorkspaceFolders(() => this.clear()),
      vscode.workspace.onDidGrantWorkspaceTrust(() => this.clear()));
  }

  /**
   * The render input for a fence, `undefined` while it is being prepared, or a message when the
   * data cache is full.
   */
  prepare(source: string, env: unknown): Prepared | string | undefined {
    const document = currentDocument(env);
    const key = JSON.stringify([document?.toString() ?? '', source]);
    const found = this.entries.get(key);
    if (found) {
      this.entries.delete(key);
      this.entries.set(key, found);
      return found.error ?? found.prepared;
    }
    if (this.pending >= MAX_PENDING) { this.refresh(); return undefined; }
    if (this.entries.size >= MAX_ENTRIES) this.remove(this.entries.keys().next().value!);

    const entry: Entry = { document: document?.toString() ?? '', paths: new Set(), bytes: 0 };
    this.entries.set(key, entry);
    this.pending++;
    const reader = readerFor(this.library, document, (path) => entry.paths.add(path));
    void this.library.prepare(source, { reader }).then((prepared) => {
      if (this.disposed || this.entries.get(key) !== entry) return;
      const bytes = prepared.files.reduce((sum, file) => sum + file.bytes.length, 0);
      if (this.bytes + bytes > MAX_CACHE_BYTES) {
        entry.error = 'Open data exceeds the 32 MiB cache budget. Close unused Markdown documents and run Gnuplot: Refresh Data.';
        return;
      }
      entry.bytes = bytes;
      this.bytes += bytes;
      entry.prepared = prepared;
    }, (error: unknown) => {
      // `prepare` rejects only for programmer errors; this fence alone shows it.
      if (this.entries.get(key) === entry) entry.error = error instanceof Error ? error.message : 'Unable to prepare the plot.';
    }).finally(() => { this.pending--; this.refresh(); });
    return undefined;
  }

  clear(): void {
    this.entries.clear();
    this.bytes = 0;
    this.refresh();
  }

  private remove(key: string): void {
    const entry = this.entries.get(key);
    if (entry) { this.bytes -= entry.bytes; this.entries.delete(key); }
  }

  private refresh(): void {
    if (this.disposed || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void vscode.commands.executeCommand('markdown.preview.refresh').then(undefined, () => {});
    }, 100);
  }

  private invalidate(uri: vscode.Uri): void {
    if (uri.scheme !== 'file') return;
    let changed = false;
    for (const [key, entry] of this.entries) {
      if ([...entry.paths].some((path) => path === uri.fsPath || path.startsWith(uri.fsPath + sep))) {
        this.remove(key);
        changed = true;
      }
    }
    if (changed) this.refresh();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    for (const item of this.subscriptions) item.dispose();
    this.entries.clear();
    this.bytes = 0;
  }
}
