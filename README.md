# WORK IN PROGRESS

live demo : https://cxfreeze.github.io/gen-game/

## Development

This project uses Angular 22 with standalone components, signals, and zoneless change detection. `zone.js` is not installed.

- `npm start`: start the Angular development server
- `npm run build`: create the production bundle in `dist/`
- `npm test`: run session lifecycle and input regression tests in Node without a browser or application build (Node 24+)

The Angular shell is split between `GameViewportComponent`, which exposes the canvas and forwards its lifecycle to `GameSessionService`, and `GameOverlayComponent`, which composes the loading and debug overlays. `GameUiService` owns the loading state; `DebugPanelService` owns debug controls and statistics. They expose read-only signals.

Angular infrastructure lives under `src/app/core/`, features under `src/app/features/`, and reusable UI components and directives under `src/app/shared/`. `features/gameplay` owns the viewport, overlays, loading, and session lifecycle; `features/debug` owns the debug panel and FPS counter. Services stay alongside the feature they serve.

`core/game-engine/GameEngineService` is the Angular entry point to `src/engine/`. It exposes the current seed, statistics, and debug control state through read-only signals. Debug reads those signals directly; `GameSessionService` manages startup, loading, and shutdown without depending on debug services.

The engine is organized by domain: `runtime`, `assets`, `characters`, `player`, `enemies`, `projectiles`, `world`, and `utils`. Types live next to their domain. World placement calculations receive their random functions and configuration explicitly, and the render queue manages progressive rendering separately from scene generation.

Each game session owns its cancellation signal, loading notifications, subscriptions, and deferred work. Stopping a session releases input listeners, Babylon resources, asset containers, and manager instances. A pending asset request may finish after cancellation, but its result is disposed without resuming the old session.
