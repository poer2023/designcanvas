# DesignCanvas

DesignCanvas is a Windows-first, local-first AI design workspace. It is not an image generator. The product centers on an infinite canvas where users collect assets, create briefs and notes, run design tasks, compare outputs, preserve recipes, and reuse project context. Image generation is one optional tool in that workspace.

## Current Architecture

```text
Electron main
  SQLite + filesystem + native dialogs + future workers
        |
        | typed IPC through preload
        v
Next.js / React renderer
  tldraw freeform canvas + project UI
        |
        v
Independent execution graph + recipes + provider adapters
```

The main freeform canvas uses the same core canvas SDK family observed in Lovart's current runtime: `tldraw`, pinned to `4.5.8` for the first interaction baseline. It is the only user-facing project workspace; the former React Flow implementation is archived under `src/legacy` and is not reachable in the application.

## Implemented Baseline

- Electron main/preload shell with context isolation
- packaged Next standalone renderer startup
- package preparation that strips repository database files from the standalone renderer
- Electron-owned SQLite under the OS user data directory
- typed project, execution-graph, and canvas-document IPC
- separate `canvas_documents` and `project_graphs` persistence
- `/projects/[id]/canvas` tldraw workspace
- custom design cards for briefs, notes, assets, agent tasks, and generation drafts
- canvas-local Agent, Generate, and Assets modes
- debounced document and camera autosave with optimistic version checks
- hard redirects from former project and feature routes into the new workspace
- Next.js 16.2.10 and React 19.2.7 security baseline

## Local Development

Node 22 or 24 is required. Node 22 LTS is the Windows handoff baseline.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
```

Open `http://127.0.0.1:3000`. New and existing project cards open the tldraw canvas.

Electron development:

```bash
pnpm run desktop:rebuild
pnpm run desktop:dev
```

The desktop renderer and desktop tests run with Electron's bundled Node runtime so native SQLite uses one ABI consistently.
Development data is stored under the OS application-data directory in a dedicated `DesignCanvas` folder, never under the generic Electron profile.

Production-style preview:

```bash
pnpm run desktop:preview
```

## Verification

```bash
pnpm run typecheck
pnpm run test:desktop
pnpm run lint
pnpm run build
pnpm run desktop:prepare-renderer
node --check desktop/main.cjs
node --check desktop/preload.cjs
node --check desktop/services/database.cjs
node --check desktop/services/runtime-paths.cjs
node --check desktop/services/validation.cjs
node --check desktop/scripts/prepare-renderer.cjs
```

The macOS ARM64 unpacked application has passed a packaged-runtime smoke test: standalone renderer boot, home page, compatibility API, native SQLite, and split user-data paths. This is packaging-structure evidence only; Windows 11 remains the release platform gate.

## Licensing Gate

The tldraw SDK is source-available, but production use requires a trial, hobby, or commercial license key. Commercial production requires a commercial license. Development can continue without a key; a distributable build cannot. Configure the public build-time key with `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` after obtaining the appropriate license.

See the [tldraw license documentation](https://tldraw.dev/community/license) and [license-key documentation](https://tldraw.dev/sdk-features/license-key).

## Documentation

- [Architecture Charter](docs/architecture-charter.md)
- [Desktop Architecture](docs/desktop-architecture.md)
- [Electron Migration Plan](docs/electron-migration-plan.md)
- [Canvas Performance Budget](docs/canvas-performance-budget.md)
- [Lovart Runtime Evidence](docs/lovart-runtime-evidence.md)
- [Windows Handoff](docs/windows-handoff.md)
