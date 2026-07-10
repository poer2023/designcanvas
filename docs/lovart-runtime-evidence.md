# Lovart Runtime Evidence

Inspection date: 2026-07-10

Scope: authenticated Lovart project canvas in the owner's Chrome profile. This document records runtime evidence used to choose a canvas foundation. It does not copy Lovart source code, proprietary assets, API payloads, or brand content.

## Direct Runtime Evidence

- The canvas root exposes the accessible application name `tldraw`.
- Loaded JavaScript includes chunks named `async/lib-tldraw~0` and `async/lib-tldraw~2`.
- Loaded CSS includes an `async/lib-tldraw` chunk.
- Loaded font URLs use `cdn.tldraw.com/4.5.8/fonts/...`.
- The visible shell uses a full-bleed canvas, compact top bar, floating bottom tool rail, lower-left camera controls, and a right-side task/chat panel.

Conclusion: Lovart's inspected canvas runtime uses the tldraw SDK family and currently exposes version `4.5.8` through its asset URLs.

## Architecture Derived From Evidence

- Pin `tldraw@4.5.8` for the first interaction baseline instead of approximating camera and selection physics with React Flow.
- Keep application chrome, task panel, and domain controls as React DOM overlays around tldraw.
- Implement design objects as custom shapes whose props remain lightweight.
- Keep workflow execution in an independent graph model.
- Compare interaction behavior through repeatable local fixtures rather than copying minified Lovart chunks.

## Evidence Limits

- Chunk names and asset URLs prove the shipped SDK family and exposed version, not Lovart's complete internal architecture.
- Minified production code was not treated as reusable source.
- Server APIs, agent orchestration, collaboration, billing, and proprietary shape implementations were not inferred from the canvas shell.
- Product behavior must be validated independently in DesignCanvas.
