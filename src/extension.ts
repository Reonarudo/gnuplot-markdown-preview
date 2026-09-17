import type { ExtensionContext } from 'vscode';
import type MarkdownItConstructor from 'markdown-it';
type MarkdownIt = InstanceType<typeof MarkdownItConstructor>;
import { markdownPlugin } from './markdown';
import { createRenderer, createRuntime } from './renderer';
export async function activate(context: ExtensionContext): Promise<{extendMarkdownIt(md: MarkdownIt): MarkdownIt}> {
  try {
    const runtime = await createRuntime(context.asAbsolutePath('dist'));
    context.subscriptions.push({dispose: () => runtime.dispose()});
    const render = createRenderer(runtime);
    return {extendMarkdownIt: (md) => markdownPlugin(md, render)};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'WASM initialization failed.';
    return {extendMarkdownIt: (md) => markdownPlugin(md, () => { throw new Error(`Gnuplot could not start: ${message}`); })};
  }
}
