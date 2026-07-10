# Windows Development Handoff

## Prerequisites

- Windows 11
- Git
- Node.js 22 LTS, at least 22.12
- Corepack
- Visual Studio Build Tools with Desktop development with C++ if a native prebuild is unavailable

The repository pins pnpm 9.15.9 and declares the supported Node range.

## Clone And Install

```powershell
git clone https://github.com/poer2023/designcanvas.git
cd designcanvas
corepack enable
pnpm install --frozen-lockfile
pnpm run desktop:rebuild
```

If Electron downloads are unstable:

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
pnpm install --frozen-lockfile
pnpm rebuild electron
pnpm run desktop:rebuild
```

## Start

Web renderer:

```powershell
pnpm run dev
```

Electron:

```powershell
pnpm run desktop:dev
```

`desktop:dev` runs both Electron main and the Next compatibility renderer with Electron's bundled Node runtime. This prevents native SQLite ABI mismatches.

If you later return to browser-only `pnpm run dev` after an Electron rebuild, restore the normal Node native module first:

```powershell
pnpm rebuild better-sqlite3
```

Set `DESIGNCANVAS_OPEN_DEVTOOLS=1` before the desktop command only when DevTools are needed.

## First Smoke Test

1. Launch the project library.
2. Create a project.
3. Confirm it opens at `/projects/<id>/canvas`.
4. Pan and zoom with mouse and precision touchpad.
5. Add brief, note, asset, task, and generation cards.
6. Resize and move cards; use undo and redo.
7. Draw, add text, and create a frame.
8. Drag a card's right output port onto a generation card's left input port; confirm the live curve turns blue over the target and the Agent panel shows one valid connection after release.
9. Select a generation node, submit an iteration through the Agent composer, and confirm a connected downstream node appears.
10. Run all nodes, then edit the downstream node through the collapsed inspector and run from the selected node; confirm both result previews update.
11. Add a reverse connection, confirm cycle validation blocks execution, then undo it.
12. Collapse and reopen the right panel; confirm only Agent and Assets tabs exist and the composer remains the primary Agent surface.
13. Wait for the saved indicator, close the project, reopen it, and confirm content plus camera position survived.
14. Import a local asset and confirm an asset card appears.
15. Confirm `/projects/<id>` redirects to `/projects/<id>/canvas`.
16. Disable networking and repeat open/edit/save for the existing project.

Electron data is stored under `app.getPath('userData')`, normally `%APPDATA%\DesignCanvas` on Windows. It is not stored in the repository checkout. Set `DESIGNCANVAS_USER_DATA_DIR` only when an isolated smoke-test profile is required.

## Build

Verify first:

```powershell
pnpm run typecheck
pnpm run test:desktop
pnpm run lint
pnpm run build
```

Build the Windows x64 installer on Windows:

```powershell
pnpm run desktop:dist:win
```

The Next standalone renderer is copied into the Electron resources directory and started automatically on a free loopback port in packaged builds.
The build runs `desktop:prepare-renderer`, which rejects any repository `.db`, `.db-wal`, or `.db-shm` file left in the standalone payload. Compatibility routes write to `%APPDATA%\DesignCanvas\compat`; project, graph, and tldraw state use the Electron-owned database.

## tldraw Production License

Development works without a key. A distributed production build requires the appropriate tldraw license. After obtaining it, set the public build-time key:

```powershell
$env:NEXT_PUBLIC_TLDRAW_LICENSE_KEY="tldraw-..."
pnpm run desktop:dist:win
```

Do not publish an installer merely because the loopback runtime technically launches without a key. Production use is a contractual gate.

## Known Remaining Work

- Windows package and clean-machine evidence are not yet recorded.
- The application still uses Electron's default icon; add reviewed Windows `.ico` assets before installer release.
- Asset import copies files locally, but the safe asset URL protocol and real image shape are next.
- Recipes, provider settings, jobs, and posters still use compatibility Next routes.
- The runner has not moved to an Electron worker.
- Secrets still need Electron `safeStorage` ownership.
- Signing, SmartScreen reputation, auto-update, backup, and crash-recovery tests remain.
