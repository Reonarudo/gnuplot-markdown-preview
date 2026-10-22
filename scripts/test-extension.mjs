import { runTests } from '@vscode/test-electron';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Runs test/extension/index.cjs inside a real VS Code. GNUPLOT_EXTENSION_PATH points it at an
// unpacked VSIX (scripts/test-package.mjs) or an installed copy; without it, it runs the working
// tree. Run from inside VS Code (a terminal, an agent), this is inherited and would start the
// downloaded VS Code as plain Node.
delete process.env.ELECTRON_RUN_AS_NODE;
const root = await mkdtemp(join(tmpdir(), 'gnuplot-host-'));
const workspace = join(root, 'workspace');
await mkdir(workspace);
const extensionPath = resolve(process.env.GNUPLOT_EXTENSION_PATH ?? '.');
try {
  await runTests({
    ...(process.env.VSCODE_EXECUTABLE
      ? { vscodeExecutablePath: process.env.VSCODE_EXECUTABLE }
      : { version: process.env.VSCODE_VERSION ?? 'stable' }),
    extensionDevelopmentPath: extensionPath,
    extensionTestsPath: resolve('test/extension/index.cjs'),
    extensionTestsEnv: { GNUPLOT_TEST_WORKSPACE: workspace, GNUPLOT_EXTENSION_PATH: extensionPath },
    launchArgs: [
      workspace,
      '--user-data-dir=' + join(root, 'user'),
      '--extensions-dir=' + join(root, 'extensions'),
      '--skip-welcome', '--skip-release-notes', '--disable-updates', '--disable-extensions'
    ]
  });
} finally {
  await rm(root, { recursive: true, force: true });
}
