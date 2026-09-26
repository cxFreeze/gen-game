# WORK IN PROGRESS

live demo : https://cxfreeze.github.io/gen-game/

## Development

This project uses Angular 22 with standalone components, signals, and zoneless change detection. `zone.js` is not installed.

- `npm start`: start the Angular development server
- `npm run build`: create the production bundle in `dist/`
- `npm test`: run session lifecycle and input regression tests in Node without a browser or application build (Node 24+)

The Angular shell is split between `CanvasComponent`, which exposes the canvas and forwards its lifecycle to `GameSessionService`, and `GameOverlayComponent`, which composes the loading and debug overlays. `GameUiStore` owns the loading state; `DebugPanelService` owns debug controls and statistics. They expose read-only signals.

Game features live under `src/app/game/`, while reusable UI components and directives live under `src/app/shared/`. `GameEngineService` is the Angular entry point to `src/engine/`; components and UI state services do not access engine managers directly.

The engine is organized by domain: `runtime`, `assets`, `characters`, `player`, `enemies`, `projectiles`, `world`, and `utils`. Types live next to their domain. World placement calculations receive their random functions and configuration explicitly, and the render queue manages progressive rendering separately from scene generation.

Each game session owns its cancellation signal, loading notifications, subscriptions, and deferred work. Stopping a session releases input listeners, Babylon resources, asset containers, and manager instances. A pending asset request may finish after cancellation, but its result is disposed without resuming the old session.
