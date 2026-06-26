# DesignCanvas

DesignCanvas is a local-first AI design workspace. The product direction is not an image generator. Image generation is one tool inside a broader canvas where users collect assets, run design tasks, compare outputs, preserve recipes, and reuse project context.

The current codebase started as a Next.js prototype for a node-based poster design workspace. The next development phase should move the product into an Electron desktop app for Windows-first distribution while keeping the existing project graph, SQLite storage, provider adapters, snapshot model, and recipe runner.

## Product Direction

The intended product is a Lovart-like / Freepik-Spaces-like local design client:

- infinite canvas as the primary workspace
- cards and assets as first-class canvas objects
- AI generation and editing as tools, not the whole product
- local project files, local SQLite state, and auditable execution history
- reusable design workflows through nodes, snapshots, recipes, and templates
- Windows desktop distribution first

## Current State

The repository already contains useful product and engineering assets:

- `PRD-v2.1.md`: latest product plan for Spaces-style graph execution, node action bars, output replace/reset, media reuse, and recipe replay
- `src/components/graph/SkillGraphCanvas.tsx`: current React Flow canvas
- `src/lib/engine/runner.ts`: DAG runner with `RUN_NODE`, `RUN_FROM_HERE`, `RUN_GROUP`, and `RUN_ALL`
- `src/store/snapshotStore.ts`: output snapshot and active output semantics
- `src/store/recipeStore.ts`: recipe recording and replay state
- `src/lib/db/schema.sql`: local SQLite data model
- `src/lib/adapters/*`: model/provider adapter layer

The current main canvas uses `@xyflow/react`, which is suitable for workflow graphs but is not ideal for a smooth freeform infinite design canvas. The recommended next step is to introduce `tldraw` as the primary freeform canvas and keep React Flow either as a workflow/DAG view or as an internal execution graph.

## Target Stack

Windows-first desktop baseline:

```text
Electron
React + TypeScript
tldraw primary canvas
Zustand state
better-sqlite3 local database
Node worker / child_process for local agent tasks
electron-builder for Windows packaging
```

Why Electron:

- Windows compatibility is more predictable because Chromium and Node ship with the app.
- The existing code already depends on Node-oriented local capabilities such as SQLite and provider adapters.
- Future local agent features will likely need filesystem, child processes, shell/task execution, Playwright, or node-pty.
- Electron keeps the first Windows client simpler than a Tauri migration.

## Immediate Development Plan

1. Restore the current web prototype to a green baseline.
   - fix `pnpm-workspace.yaml`
   - fix current TypeScript build blockers
   - clean blocking React hook/ref lint errors

2. Add the Electron app shell.
   - Electron main process owns local database, filesystem, secure config, and worker lifecycle
   - renderer remains React UI
   - all local capabilities go through a typed desktop bridge

3. Replace the primary canvas interaction layer.
   - add `tldraw`
   - create custom shapes for text, image, media, generated result, task, group, and workflow cards
   - preserve existing graph/runner concepts behind the canvas

4. Keep image generation as a tool node.
   - generation stays behind provider adapters
   - results become reusable assets and snapshots
   - recipe history records what produced each result

## Useful Commands

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm run dev
```

Current note: before this handoff, `pnpm install` failed because `pnpm-workspace.yaml` did not declare `packages`. That has been corrected.

## Documentation

- [Desktop Architecture](docs/desktop-architecture.md)
- [Windows Handoff](docs/windows-handoff.md)
- [Migration Plan](docs/electron-migration-plan.md)

