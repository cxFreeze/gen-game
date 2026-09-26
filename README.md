# WORK IN PROGRESS

live demo : https://cxfreeze.github.io/gen-game/

## Development

This project uses Angular 22 with standalone components, signals, and zoneless change detection. `zone.js` is not installed.

- `npm start`: start the Angular development server
- `npm run build`: create the production bundle in `dist/`
- `npm test`: run session lifecycle and input regression tests in Node without a browser or application build (Node 24+)

The Angular shell is split between `CanvasComponent`, which exposes the canvas and forwards its lifecycle to `GameSessionService`, and `UiComponent`, which renders the loading and debug overlays from `GameUiStore` signals. The service owns game startup, loading errors, and statistics updates.

Each game session owns its cancellation signal, loading notifications, subscriptions, and deferred work. Stopping a session releases input listeners, Babylon resources, asset containers, and manager instances. A pending asset request may finish after cancellation, but its result is disposed without resuming the old session.
