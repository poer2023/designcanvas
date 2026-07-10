const path = require('node:path');

function resolveSchemaFiles({ isPackaged, resourcesPath, mainDir }) {
  if (isPackaged) {
    return [
      path.join(resourcesPath, 'schema', 'schema.sql'),
      path.join(resourcesPath, 'schema', 'schema-v1.9.sql'),
    ];
  }

  return [
    path.resolve(mainDir, '..', 'src/lib/db/schema.sql'),
    path.resolve(mainDir, '..', 'src/lib/db/schema-v1.9.sql'),
  ];
}

module.exports = { resolveSchemaFiles };
