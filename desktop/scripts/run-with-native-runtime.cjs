const { spawn, spawnSync } = require('node:child_process');

const runtime = process.argv[2];
const args = process.argv.slice(3);

if (!['node', 'electron'].includes(runtime) || args.length === 0) {
  console.error(
    'Usage: node desktop/scripts/run-with-native-runtime.cjs <node|electron> <command arguments>',
  );
  process.exit(1);
}

const executable = runtime === 'electron' ? require('electron') : process.execPath;
const runtimeEnv = {
  ...process.env,
  ...(runtime === 'electron' ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
};
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const probe = [
  "const Database = require('better-sqlite3');",
  "const database = new Database(':memory:');",
  'database.close();',
].join('');

function probeNativeModule() {
  return spawnSync(executable, ['-e', probe], {
    env: runtimeEnv,
    encoding: 'utf8',
  });
}

let probeResult = probeNativeModule();

if (probeResult.status !== 0) {
  const rebuildArgs =
    runtime === 'electron'
      ? ['exec', 'electron-rebuild', '--force', '--only', 'better-sqlite3']
      : ['rebuild', 'better-sqlite3'];

  console.log(
    `[native-runtime] Rebuilding better-sqlite3 for ${runtime}; the installed ABI does not match.`,
  );

  const rebuild = spawnSync(pnpm, rebuildArgs, { stdio: 'inherit' });
  if (rebuild.status !== 0) {
    process.exit(rebuild.status ?? 1);
  }

  probeResult = probeNativeModule();
  if (probeResult.status !== 0) {
    process.stderr.write(probeResult.stderr || probeResult.stdout);
    process.exit(probeResult.status ?? 1);
  }
}

const child = spawn(executable, args, {
  env: runtimeEnv,
  stdio: 'inherit',
  windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) child.kill(signal);
  });
}

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
