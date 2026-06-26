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

## Current Validation Commands

```bash
pnpm run lint
pnpm run build
pnpm run dev
```

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

