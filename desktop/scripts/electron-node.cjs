const { spawn } = require('node:child_process');

const electronPath = require('electron');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node desktop/scripts/electron-node.cjs <node arguments>');
  process.exit(1);
}

const child = spawn(electronPath, args, {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
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
