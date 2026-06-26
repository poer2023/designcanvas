# Windows Development Handoff

## Repository

```bash
git clone https://github.com/poer2023/designcanvas.git
cd designcanvas
```

## Install

Use pnpm.

```bash
corepack enable
pnpm install --frozen-lockfile
```

If native SQLite dependency installation fails on Windows, install the usual native build prerequisites for Node modules, then retry.

If Electron binary download is unstable, install or rebuild with a mirror:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
pnpm install --frozen-lockfile
pnpm rebuild electron
```

## Current Validation Commands

```bash
pnpm run lint
pnpm run build
pnpm run dev
```

## Electron Development Shell

The first Electron shell is now present. It loads the existing Next renderer from `http://127.0.0.1:3000` and exposes a narrow preload bridge as `window.posterLabDesktop`.

```bash
pnpm run desktop:dev
```

This is a Phase 1 desktop shell, not the final offline Windows package architecture. The next step is to move local APIs from Next API routes into Electron main-process services and then make the renderer static/offline-friendly.

Preview against a production Next build:

```bash
pnpm run desktop:preview
```

Packaging config has been added in `electron-builder.yml`, but `desktop:dist` should be treated as a packaging baseline, not a finished installer, until the local API migration is complete.

## Current Product Surface

- `/`: Spaces/project list and templates
- `/projects/[id]`: full-screen canvas
- `/settings`: provider/model settings
- `/gallery`: generated poster assets
- `/inspiration`: reference sets
- `/styles`: style profiles

## Important Code Areas

- `src/app/projects/[id]/page.tsx`: current canvas screen shell
- `src/components/graph/SkillGraphCanvas.tsx`: current React Flow canvas
- `src/components/canvas/Dock.tsx`: bottom tool dock
- `src/components/canvas/AssetsDrawer.tsx`: asset reuse drawer
- `src/components/canvas/CommandPalette.tsx`: add-card command palette
- `src/lib/engine/runner.ts`: graph execution runner
- `src/store/snapshotStore.ts`: output snapshots and active output state
- `src/store/recipeStore.ts`: recipes and replay
- `src/lib/db/schema.sql`: SQLite schema
- `src/lib/adapters`: image/model provider adapters

## First Windows Tasks

1. Restore green build.
2. Add Electron main/preload build.
3. Move SQLite calls behind Electron main IPC.
4. Add `tldraw` POC route for primary freeform canvas.
5. Port one existing image card into a tldraw custom shape.

## Product Reminder

This project should become a local design workspace, not a pure image generation app. Image generation should be one capability among local assets, task execution, recipes, and reusable project context.
