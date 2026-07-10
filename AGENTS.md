# DesignCanvas Engineering Rules

## Product Definition

DesignCanvas is a Windows-first, local-first design workspace. The infinite canvas is the primary workspace. Image generation is an optional tool inside a larger workflow for collecting assets, planning, editing, comparing, automating, and exporting design work.

## Architecture Invariants

- Electron main owns SQLite, filesystem access, secure configuration, and worker processes.
- The renderer never imports Node-only modules and never receives unrestricted Node access.
- `canvas_documents` owns tldraw document and session snapshots.
- `project_graphs` owns executable workflow dependencies. Do not use canvas coordinates as execution semantics.
- Heavy binaries live in the asset store. Canvas shapes reference stable asset IDs.
- Existing projects must open and remain editable without a network connection.
- Provider-specific payloads stay behind adapters and workers, not in shape props.
- No production build using tldraw may ship without an appropriate tldraw production license.

## Failure Conditions

The architecture has failed if any of these become true:

- Opening or editing an existing local project requires a cloud service.
- Renderer code accesses SQLite, filesystem paths, shell commands, or secrets directly.
- A canvas library change requires rewriting project business data or execution history.
- Pan, zoom, selection, or drag performance is accepted without a measured Windows baseline.
- Autosave can silently lose more than two seconds of settled edits.
- A Windows installer is called ready without a clean-machine smoke test.

## Required Verification

Run before handoff:

```bash
pnpm run typecheck
pnpm run test:desktop
pnpm run lint
pnpm run build
node --check desktop/main.cjs
node --check desktop/preload.cjs
node --check desktop/services/database.cjs
```

Desktop or canvas changes also require a live browser or Electron smoke test. Windows release changes require validation on Windows, not only macOS.
