# Desktop Architecture

## Decision

Use Electron for the Windows-first desktop client. Chromium and Node ship with the app, the existing TypeScript code remains reusable, and future local agent work can use filesystem, workers, child processes, browser automation, and native modules without a Rust bridge.

## Runtime

```text
Electron main process
  app lifecycle and single-instance lock
  SQLite in app.getPath('userData')
  filesystem and native dialogs
  packaged Next standalone child process
  future job workers and secure settings
             |
             | allowlisted ipcMain handlers
             v
Electron preload
  contextBridge: DesktopBridge only
             |
             v
React renderer
  project library
  tldraw freeform canvas
  collapsible agent / asset modes
  generation-node editor inside agent
  archived editors excluded from navigation
```

`contextIsolation` is enabled and `nodeIntegration` is disabled. The renderer never imports `better-sqlite3`, `fs`, `path`, `child_process`, or Electron APIs.

## Renderer Boot

Development uses `http://127.0.0.1:3000` from `next dev`.

Packaged builds use `next.config.ts` with `output: "standalone"`. Electron reserves a loopback port, launches `resources/renderer/server.js` using Electron's Node runtime, waits for the server, and then creates the browser window. This keeps existing Next routes available while local-only routes migrate to IPC.

The loopback server is a compatibility runtime, not the owner of local desktop state.
Its temporary compatibility database is redirected to `<userData>/compat`. `desktop:prepare-renderer` removes repository database files from `.next/standalone` before packaging, so local project data and credentials cannot be copied into an installer by output tracing.

## Data Ownership

```text
canvas_documents
  tldraw document records + session/camera snapshot

project_graphs
  executable nodes + dependency edges + workflow viewport

assets directory
  imported and generated binary files

recipes / generation_jobs / audit_logs
  execution history and provenance

Zustand
  transient UI state only
```

Canvas shapes must reference heavy assets by ID. Explicit tldraw arrow bindings are compiled into `project_graphs` before each run; freeform visual position is never an execution dependency. Generation-to-generation edges pass output asset references, image URLs, and seeds into downstream `img2img` parameters.

## Native Database

`desktop/services/database.cjs` opens `designcanvas.db` under Electron's user-data directory, enables WAL, foreign keys, and a busy timeout, then records numbered migrations in `schema_migrations`.

Development explicitly uses `<appData>/DesignCanvas`; packaged builds use Electron's product-scoped default. `DESIGNCANVAS_USER_DATA_DIR` may override the location for isolated smoke tests. Do not point it at the repository database.

`better-sqlite3` must be rebuilt for Electron's ABI with:

```bash
pnpm run desktop:rebuild
```

After rebuilding, desktop renderer development and desktop tests run through `desktop/scripts/electron-node.cjs`. This keeps Electron main, the compatibility Next server, and SQLite on the same native ABI. Plain `pnpm dev` is the browser-preview path and expects the normal Node build produced by `pnpm install` or `pnpm rebuild better-sqlite3`.

The repository-local `data/posterlab.db` remains the browser-preview database. It is neither the Electron-owned database nor an installer input.

## DesktopBridge

Implemented local capabilities:

- app information and user-data path
- project list/get/create/delete
- execution graph load/save
- tldraw document load/save
- native multi-file import into the project asset directory
- placeholder run entry point

Next IPC migrations:

- asset records and the `designcanvas-asset://` read protocol
- recipes and job queue
- provider/model settings
- secrets using Electron `safeStorage`
- worker cancellation and recovery
- export and backup

## Security Baseline

- validate every IPC argument in main
- reject path separators and traversal segments before constructing asset paths
- no arbitrary IPC channel proxy
- no arbitrary filesystem path reads from renderer input
- open external HTTP links in the system browser
- block cross-origin main-window navigation
- keep provider secrets encrypted and main-process only
- record privileged agent actions in audit logs

## Production Gates

- tldraw production license key
- clean Windows 11 installer smoke test
- code signing before public distribution
- SmartScreen and auto-update strategy
- native module rebuild verification
- offline open/edit/save verification
- measured canvas performance and crash recovery
