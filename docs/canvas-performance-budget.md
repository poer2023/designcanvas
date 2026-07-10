# Canvas Performance Budget

## Baseline Device

Primary acceptance hardware:

- Windows 11
- 4 physical CPU cores
- 8 GB RAM
- integrated GPU
- 1920 x 1080 display at 100% and 150% scaling
- mouse and precision touchpad

Faster development machines do not replace this baseline.

## Budgets

| Area | Target | Failure threshold |
| --- | --- | --- |
| Warm desktop startup | <= 3 s | > 5 s |
| Cold desktop startup | <= 5 s | > 8 s |
| Pan/zoom at 500 lightweight shapes | p95 frame <= 16.7 ms | p95 > 25 ms |
| Long tasks during 10 s pan | none > 50 ms | any repeated > 50 ms |
| Select/drag visual response | p95 <= 50 ms | p95 > 100 ms |
| Autosave after settled edit | durable <= 2 s | > 3 s or silent loss |
| Open 500-shape document | <= 2 s after shell | > 4 s |
| Working set at 500 lightweight shapes | <= 700 MB | > 1 GB |

## Test Documents

- `small`: 25 mixed domain shapes and 10 bindings
- `medium`: 200 shapes, 50 assets, and 100 bindings
- `large`: 500 lightweight shapes, 100 asset thumbnails, and 300 bindings
- `stress`: 2,000 lightweight shapes for degradation observation, not a release promise

Heavy media payloads are never embedded in shape props. Tests use thumbnail references and separate local asset files.

## Measurement Rules

- measure a production renderer, not React development mode
- record Windows hardware, scaling, app version, tldraw version, and document fixture hash
- test pan, wheel zoom, touchpad zoom, multi-select, drag, resize, undo, and agent-result insertion
- use Chromium performance traces and renderer process memory
- keep raw traces or summarized JSON under `artifacts/performance/<date>/`

## Optimization Order

1. Remove unnecessary React rerenders around the canvas.
2. Keep shape components shallow and payloads small.
3. Use tldraw culling and stable shape utilities.
4. Render thumbnails instead of original media.
5. Batch persistence and worker messages.
6. Move expensive parsing, hashing, and generation into workers.

Do not hide coordinate, state, or lifecycle bugs by lowering visual quality or disabling core interactions.
