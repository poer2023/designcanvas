const fs = require('node:fs');
const path = require('node:path');

const rendererRoot = path.resolve('.next/standalone');
const requiredFiles = [
  path.join(rendererRoot, 'server.js'),
  path.join(rendererRoot, 'src/lib/db/schema.sql'),
  path.join(rendererRoot, 'src/lib/db/schema-v1.9.sql'),
];

for (const requiredFile of requiredFiles) {
  if (!fs.existsSync(requiredFile)) {
    throw new Error(`Standalone renderer is missing: ${requiredFile}`);
  }
}

fs.rmSync(path.join(rendererRoot, 'data'), { recursive: true, force: true });

function findDatabaseFiles(directory, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      findDatabaseFiles(entryPath, found);
    } else if (/\.(?:db|db-shm|db-wal)$/i.test(entry.name)) {
      found.push(entryPath);
    }
  }
  return found;
}

const bundledDatabases = findDatabaseFiles(rendererRoot);
if (bundledDatabases.length > 0) {
  throw new Error(`Standalone renderer still contains database files:\n${bundledDatabases.join('\n')}`);
}

console.log('Standalone renderer prepared without repository database files.');
