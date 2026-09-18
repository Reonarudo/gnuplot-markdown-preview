import type { ExtensionContext } from 'vscode';
import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { markdownPlugin } from './markdown';
import { createRenderer, createRuntime } from './renderer';
import { DocumentData } from './documents';
export async function activate(context: ExtensionContext): Promise<{extendMarkdownIt(md: MarkdownIt): MarkdownIt}> {
  try {
    const runtime = await createRuntime(context.asAbsolutePath('dist'));
    context.subscriptions.push({dispose: () => runtime.dispose()});
    const render = createRenderer(runtime);
    const documents=new DocumentData();
    context.subscriptions.push(documents);
    return {extendMarkdownIt: (md) => markdownPlugin(md, (source,env) => {
      const input=documents.prepare(source,env);
      return input?render(input):'<p role="status">Loading gnuplot data…</p>';
    })};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WASM initialization failed.';
    return {extendMarkdownIt: (md) => markdownPlugin(md, () => { throw new Error(`Gnuplot could not start: ${message}`); })};
  }
}
