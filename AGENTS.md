# DesignCanvas Engineering Rules

## Product Definition

DesignCanvas is a Windows-first, local-first design workspace. The infinite canvas is the primary workspace. Image generation is an optional tool inside a larger workflow for collecting assets, planning, editing, comparing, automating, and exporting design work.

## Architecture Invariants

- Electron main owns SQLite, filesystem access, secure configuration, and worker processes.
- The renderer never imports Node-only modules and never receives unrestricted Node access.
- `canvas_documents` owns tldraw document and session snapshots.
- `project_graphs` owns executable workflow dependencies. Do not use canvas coordinates as execution semantics.
- tldraw arrows are the user-facing workflow bindings. Compile their shape bindings into `project_graphs` before execution; never infer dependencies from card proximity or position.
- Card ports are the primary connection affordance. Dragging a right output port onto a left input port must show a live curve preview and create a persistent curved workflow arrow anchored to both port centers. Port hit targets must remain substantially larger than their visible dots. Click-output then click-input remains an accessibility fallback. The generic arrow tool may remain available, but users must not need to discover it before they can build a workflow.
- The tldraw workspace is the only user-facing editor. Do not expose archived React Flow routes or navigation.
- Generation is represented by lightweight canvas cards; actual provider execution belongs to workers and job storage.
- A generation card must expose its prompt, model, ratio, advanced-settings entry, and run action on the card itself. The right inspector may add depth but cannot be the only discoverable control surface.
- The right panel has only Agent and Assets modes. Generation nodes and their parameters belong inside Agent, not in a separate application mode.
- Agent opens as a natural-language composer and activity thread. Node parameters stay in a collapsed contextual inspector and must not replace the composer as the panel's primary surface.
- Heavy binaries live in the asset store. Canvas shapes reference stable asset IDs.
- Existing projects must open and remain editable without a network connection.
- Provider-specific payloads stay behind adapters and workers, not in shape props.
- No production build using tldraw may ship without an appropriate tldraw production license.

## Failure Conditions

The architecture has failed if any of these become true:

- Opening or editing an existing local project requires a cloud service.
- Renderer code accesses SQLite, filesystem paths, shell commands, or secrets directly.
- A canvas library change requires rewriting project business data or execution history.
- A feature requires leaving the tldraw project workspace for an older editor surface.
- Pan, zoom, selection, or drag performance is accepted without a measured Windows baseline.
- Autosave can silently lose more than two seconds of settled edits.
- Programmatic graph, parameter, or generation-result updates bypass document autosave.
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
