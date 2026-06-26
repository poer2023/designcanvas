# Electron Migration Plan

## Goal

Move DesignCanvas from a web prototype into a Windows-first Electron desktop client without losing the current project graph, SQLite, recipe, snapshot, and adapter work.

## Phase 0: Stabilize Current Baseline

Exit criteria:

- `pnpm install --frozen-lockfile` works
- `pnpm run build` passes
- blocking lint errors are fixed or intentionally scoped
- README describes the real product instead of the default Next.js template

Known issues from the handoff audit:

- `pnpm-workspace.yaml` was missing `packages`
- `npm run build` failed on the React Flow drag handler type in `SkillGraphCanvas.tsx`
- `npm run lint` reported React hook/ref errors and many cleanup warnings

## Phase 1: Electron Shell

Add Electron around the existing renderer with minimum product disruption.

Recommended file layout:

```text
desktop/
  main/
    app.ts
    ipc.ts
    windows.ts
    services/
      database.ts
      assets.ts
      jobs.ts
      providers.ts
  preload/
    index.ts
  workers/
    runner.ts

src/
  lib/desktop/
    bridge.ts
    types.ts
```

Phase 1 can still run the existing Next renderer. The goal is to establish desktop packaging and local capability ownership.

Current scaffold:

- `desktop/main.cjs`
- `desktop/preload.cjs`
- `src/lib/desktop/types.ts`
- `src/lib/desktop/bridge.ts`
- `electron-builder.yml`
- `pnpm run desktop:dev`
- `pnpm run desktop:preview`

## Phase 2: Local API Migration

Move local APIs out of Next API routes and into Electron main services:

- projects
- project graphs
- recipes
- jobs
- posters/assets
- provider settings
- encrypted API keys

The renderer should use `DesktopBridge` instead of `fetch('/api/...')` for local operations.

## Phase 3: tldraw Primary Canvas

Introduce `tldraw` as the primary canvas and keep the current React Flow graph as a compatibility view.

Steps:

1. Create a small tldraw route/page with custom cards.
2. Map existing node records to tldraw shapes.
3. Store shape state in `project_graphs`.
4. Keep execution dependencies in a graph model independent from visual coordinates.
5. Port node action bars, assets drawer, result wall, and recipe replay to tldraw.

## Phase 4: Windows Packaging

Use `electron-builder`.

Minimum targets:

- NSIS installer for Windows
- unpacked dev build
- signed build later
- auto-update only after the app has a stable release channel

## Avoid For Now

- do not rewrite the full app in Rust
- do not turn image generation into the only product workflow
- do not couple tldraw shape data directly to provider-specific generation payloads
- do not let the renderer own SQLite or filesystem access
