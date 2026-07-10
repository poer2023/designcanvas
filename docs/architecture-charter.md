# Architecture Charter

## Creation Layer

DesignCanvas exists to make local design work inspectable, reusable, and automatable on an infinite canvas. It must remain useful without a cloud connection and must not collapse into a single-purpose image-generation interface.

The first distribution target is Windows. Compatibility, recoverability, and interaction quality matter more than installer size.

## Decision Authority

When evidence conflicts, use this order:

1. Explicit product direction from the owner.
2. Measured runtime behavior and saved project data.
3. Automated tests, builds, and Windows smoke tests.
4. This charter and architecture documentation.
5. Implementation convenience.

## Stable Boundaries

### Canvas and execution are separate

Human law: Users may arrange work freely without accidentally changing what a workflow executes.

Machine law:

- Trigger: storing or loading canvas state.
- Required action: write tldraw state to `canvas_documents`; write DAG state to `project_graphs`.
- Evidence: either model can load when the other is empty.
- Exception: an explicit compiler may derive an execution graph from canvas bindings, but the derived graph remains a separate artifact.

### Local capabilities belong to Electron main

Human law: The visual layer cannot become a privileged local process.

Machine law:

- Trigger: SQLite, filesystem, secrets, processes, shell, native dialogs, or updates.
- Required action: expose a narrow typed IPC capability through preload.
- Evidence: renderer bundles do not import Node-only modules.
- Exception: browser-safe APIs such as Clipboard and IndexedDB may support web preview, but are not the desktop source of truth.

### Shape data stays lightweight

Human law: Moving a card must not move or serialize a large binary payload.

Machine law:

- Trigger: adding shape props.
- Required action: store presentation state and stable IDs only; keep media and run payloads in asset/job storage.
- Evidence: snapshot size grows with records, not source asset bytes.
- Exception: tiny text and metadata required to render the shape.

### Image generation remains auxiliary

Human law: A project remains valuable when every generation provider is disabled.

Machine law:

- Trigger: adding generation behavior.
- Required action: implement it as a task/provider adapter whose outputs become assets.
- Evidence: briefs, notes, assets, layout, editing, and export remain usable offline.
- Exception: none.

## Release Gates

- No tldraw production distribution without the required production license.
- No Windows-ready claim without a clean Windows 11 install, launch, create, edit, restart, and uninstall test.
- No local-first claim if an existing project cannot open and save offline.
- No smooth-canvas claim without the performance budget in `canvas-performance-budget.md`.
- No provider secret may be persisted as plaintext or exposed to renderer code.

## Current Phase Definition Of Done

- Electron can own project, execution graph, and tldraw document persistence.
- A project opens in a real tldraw canvas with custom domain shapes.
- Pan, zoom, selection, resize, draw, text, frame, undo, and redo work.
- Canvas content and camera state survive reload.
- The packaged build contains and starts its own Next standalone renderer.
- Typecheck, production build, lint, browser smoke, and desktop smoke evidence are recorded.
