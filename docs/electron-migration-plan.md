# Electron Migration Plan

## Goal

Turn the existing Next.js prototype into a Windows-first local design client while preserving its project, graph, recipe, snapshot, and provider work.

## Phase 0: Green Baseline - Complete

- pnpm workspace installs cleanly
- TypeScript and production build pass
- README describes the real product
- Next.js and React are on a patched baseline

## Phase 1: Desktop Runtime - Implemented, Windows Proof Pending

Implemented:

- Electron main and preload
- typed IPC surface
- Electron-owned SQLite in the user-data directory
- schema migration ledger
- single-instance behavior
- native file import copy
- Next standalone packaged-renderer bootstrap
- compatibility data redirected to user data and repository databases stripped before packaging
- electron-builder NSIS configuration

Remaining proof:

- rebuild native modules on Windows
- package an unpacked Windows build
- install and launch the NSIS artifact on a clean Windows 11 machine

Current evidence: on 2026-07-10, the unsigned macOS ARM64 unpacked app booted its packaged standalone renderer, served the home page and a compatibility API with HTTP 200, loaded native SQLite, and created separate main and compatibility databases in an isolated user-data profile. This validates package structure, not Windows compatibility.

## Phase 2: Local API Migration - In Progress

Moved to IPC:

- projects
- execution graphs
- tldraw canvas documents

Still on Next routes:

- posters and assets metadata
- recipes
- generation jobs
- provider/model settings
- encrypted provider secrets
- styles, briefs, and reference sets

Exit criteria: opening, editing, and exporting an existing project works with the network disabled and without relying on Next API routes for local data.

## Phase 3: Primary tldraw Canvas - First Vertical Slice Complete

Implemented:

- tldraw 4.5.8 route at `/projects/[id]/canvas`
- custom brief, note, asset, task, and generation shapes
- custom Lovart-like desktop shell and bottom toolbar
- Agent, Generate, and Assets side-panel modes inside the canvas
- pan, zoom, select, draw, text, frame, undo, and redo controls
- document plus session/camera persistence
- optimistic version conflict detection
- former React Flow source archived under `src/legacy`; former routes redirect to tldraw

Next:

1. Editable domain cards and inspector.
2. Real asset records and image/video shapes.
3. Explicit workflow bindings compiled into the execution graph.
4. Result comparison, version stacks, and provenance.
5. Agent task lifecycle and streamed activity.
6. Export, backup, and project bundle format.

## Phase 4: Agent Runtime

- move runner into an Electron worker or child process
- durable queue with cancellation, retries, and crash recovery
- provider adapters stay behind worker boundaries
- task inputs and outputs reference immutable snapshots/assets
- all privileged actions produce audit records

## Phase 5: Windows Release

- tldraw commercial or approved production license
- NSIS installer
- Windows `.ico` application and installer assets
- x64 baseline; arm64 only after demand is proven
- signing certificate and release channel
- clean-machine install/uninstall test
- offline test
- recovery test after forced termination during autosave and during a task

## Explicit Non-Goals

- no Rust rewrite
- no image-generation-only workflow
- no direct renderer access to SQLite or filesystem
- no multiplayer before single-user local persistence is proven
- no automatic tldraw major-version upgrade before snapshot migration fixtures exist
