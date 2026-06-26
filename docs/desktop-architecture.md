# Desktop Architecture

## Decision

Use Electron for the Windows-first desktop client.

Tauri v2 remains a possible future option, but it is not the recommended first client shell for this product. The first release should optimize for compatibility, local capability, and engineering speed rather than minimum bundle size.

## Target Runtime Split

```text
Electron main process
  - app lifecycle
  - secure config and key storage
  - SQLite access
  - filesystem access
  - local agent process lifecycle
  - worker queues
  - native dialogs and notifications

Electron preload
  - typed IPC bridge
  - narrow capability surface
  - no broad Node exposure to renderer

React renderer
  - app shell
  - tldraw canvas
  - project UI
  - cards, inspector, dock, asset drawer
  - reads/writes local capabilities through DesktopBridge

Worker / sidecar processes
  - long-running generation jobs
  - local model/provider calls
  - browser automation
  - file import/export
  - future agent execution
```

## Keep From Current Prototype

- SQLite schema in `src/lib/db/schema.sql`
- project graph persistence
- snapshot and active output semantics
- recipe runner and replay model
- provider adapter abstraction
- existing cards as product concepts
- PRD version history

## Replace Or Reframe

### React Flow

`@xyflow/react` should not remain the primary canvas engine if the goal is Lovart-like freeform interaction. It is good for workflow graphs but less ideal for freeform design manipulation.

Recommended use:

- short term: keep it while Electron shell and data model are stabilized
- medium term: introduce `tldraw` as the primary canvas
- long term: keep React Flow only for an optional workflow/DAG view, or remove it after the tldraw model can express execution dependencies

### Next API Routes

The current project uses Next API routes as a local server boundary. In the desktop client, do not let this become the permanent architecture.

Recommended transition:

- phase 1: Electron launches the existing Next dev/prod server as a compatibility bridge
- phase 2: move local-only APIs into Electron main IPC handlers
- phase 3: keep any cloud APIs explicit and separate from local desktop APIs

## DesktopBridge Boundary

All renderer calls to local capabilities should go through a typed bridge:

- project CRUD
- graph load/save
- asset import/export
- provider settings
- secure secrets
- run execution
- local files
- app update/status

The renderer should not import Node modules directly. This keeps a future shell swap possible and keeps Windows packaging safer.

## tldraw Shape Model

Start with these custom shapes:

- `text-card`
- `image-card`
- `media-card`
- `generated-result-card`
- `agent-task-card`
- `group-frame`
- `workflow-link`

Each shape should store only stable shape state. Heavy payloads should live in SQLite/assets and be referenced by IDs.

## Data Ownership

```text
Canvas shape state -> local project graph
Asset binary/data -> local asset store
Run state -> recipes/jobs tables
Provider settings -> app settings + secure secret store
Transient UI state -> Zustand only
```

## Security Baseline

- `contextIsolation: true`
- `nodeIntegration: false`
- strict preload allowlist
- no direct database access from renderer
- no shell execution without explicit policy and audit record
- local agent tasks recorded as jobs/artifacts

