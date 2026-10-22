import type { ExtensionContext } from 'vscode';
import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { commands, window } from 'vscode';
import type { Runtime } from '@reonarudo/gnuplot-renderer';
import { markdownPlugin, type Render } from './markdown';
import { DocumentData } from './documents';
import { resultCache } from './results';

let runtime: Runtime | undefined;

export async function activate(context: ExtensionContext): Promise<{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }> {
  const channel = window.createOutputChannel('Gnuplot Markdown Preview');
  context.subscriptions.push(channel);
  const report = (message: string) => channel.appendLine(message);

  let render: Render;
  try {
    // Required here, not imported, so that a library that fails to load lands in this `try`
    // instead of failing activation. esbuild leaves it external (ADR 0010).
    const library: typeof import('@reonarudo/gnuplot-renderer') = require('@reonarudo/gnuplot-renderer');
    const created = await library.createRuntime();
    runtime = created;
    const documents = new DocumentData(library);
    const results = resultCache((prepared) => created.render(prepared));
    context.subscriptions.push(documents, commands.registerCommand('gnuplotMarkdownPreview.refreshData', () => {
      results.clear();
      documents.clear();
    }));
    render = (source, env) => {
      const prepared = documents.prepare(source, env);
      if (prepared === undefined) return undefined;
      if (typeof prepared === 'string') return { status: 'failure', message: prepared };
      return results.render(prepared);
    };
  } catch (error) {
    report(`Gnuplot renderer failed to load: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    render = () => ({ status: 'unavailable', reason: 'the renderer failed to load; see the "Gnuplot Markdown Preview" output.' });
  }
  return { extendMarkdownIt: (md) => markdownPlugin(md, render, report) };
}

export async function deactivate(): Promise<void> {
  await runtime?.dispose();
  runtime = undefined;
}
