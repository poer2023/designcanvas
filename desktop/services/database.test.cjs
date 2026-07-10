const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { DesktopDatabase } = require('./database.cjs');
const { resolveSchemaFiles } = require('./runtime-paths.cjs');
const { requireSafePathSegment } = require('./validation.cjs');

test('desktop path validation rejects traversal project ids', () => {
  assert.equal(requireSafePathSegment('project-123', 'projectId'), 'project-123');
  for (const unsafeValue of ['', '.', '..', '../outside', '..\\outside', 'nested/project']) {
    assert.throws(() => requireSafePathSegment(unsafeValue, 'projectId'));
  }
});

test('desktop runtime resolves development and packaged schema paths', () => {
  const developmentSchema = resolveSchemaFiles({
    isPackaged: false,
    resourcesPath: '/unused',
    mainDir: path.resolve('desktop'),
  });
  assert.deepEqual(developmentSchema, [
    path.resolve('src/lib/db/schema.sql'),
    path.resolve('src/lib/db/schema-v1.9.sql'),
  ]);
  assert.equal(developmentSchema.every((schemaPath) => fs.existsSync(schemaPath)), true);

  assert.deepEqual(
    resolveSchemaFiles({
      isPackaged: true,
      resourcesPath: path.join(path.sep, 'app', 'resources'),
      mainDir: '/unused',
    }),
    [
      path.join(path.sep, 'app', 'resources', 'schema', 'schema.sql'),
      path.join(path.sep, 'app', 'resources', 'schema', 'schema-v1.9.sql'),
    ]
  );
});

test('desktop database persists versioned graph and canvas documents', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'designcanvas-db-'));
  const database = new DesktopDatabase({
    dataDir,
    schemaFiles: [
      path.resolve('src/lib/db/schema.sql'),
      path.resolve('src/lib/db/schema-v1.9.sql'),
    ],
  });

  try {
    const project = database.createProject({ name: 'Database smoke test' });
    assert.equal(database.listProjects().length, 1);
    assert.equal(database.getProject(project.id).name, 'Database smoke test');

    const emptyGraph = database.loadGraph(project.id);
    assert.deepEqual(emptyGraph.graphSnapshot, { nodes: [], edges: [] });
    assert.equal(emptyGraph.version, 1);

    const graphSave = database.saveGraph({
      projectId: project.id,
      graphSnapshot: { nodes: [{ id: 'node-1' }], edges: [] },
      viewport: { x: 12, y: 24, zoom: 1.25 },
      baseVersion: 1,
    });
    assert.deepEqual(graphSave, { success: true, version: 2 });

    const graphConflict = database.saveGraph({
      projectId: project.id,
      graphSnapshot: { nodes: [], edges: [] },
      viewport: { x: 0, y: 0, zoom: 1 },
      baseVersion: 1,
    });
    assert.equal(graphConflict.conflict, true);
    assert.equal(graphConflict.serverVersion, 2);

    const canvasSave = database.saveCanvasDocument({
      projectId: project.id,
      schemaVersion: 'tldraw-4.5',
      snapshot: { document: { store: {} }, session: { currentPageId: 'page:page' } },
      baseVersion: 0,
    });
    assert.deepEqual(canvasSave, { success: true, version: 1 });
    assert.equal(database.loadCanvasDocument(project.id).schemaVersion, 'tldraw-4.5');
  } finally {
    database.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
