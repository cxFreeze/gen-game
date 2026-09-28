# WORK IN PROGRESS

live demo : https://cxfreeze.github.io/gen-game/

## Development

This project uses Angular 22 with standalone components, signals, and zoneless change detection. `zone.js` is not installed.

- `npm start`: start the Angular development server
- `npm run build`: create the production bundle in `dist/`
- `npm test`: run session lifecycle and input regression tests in Node without a browser or application build (Node 24+)

The Angular shell is split between `GameViewportComponent`, which exposes the canvas and forwards its lifecycle to `GameSessionService`, and `GameOverlayComponent`, which composes the debug overlay. `AppComponent` keeps the menu visible during loading. `GameUiService` owns the loading state; `DebugPanelService` owns debug controls and statistics. They expose read-only signals.

The application opens on `MainMenuComponent` with a Play button and the player duck looping its `Idle` animation. Clicking Play changes that preview to `Running` in the same Babylon scene and shows `Loading...` while the gameplay viewport starts behind it. Once the game is ready, the menu and its preview are disposed. `MenuRuntime` owns the preview scene implemented by `MenuView`; it loads only the player model. Cancelling a pending preview load disposes any late asset result.

Angular infrastructure lives under `src/app/core/`, features under `src/app/features/`, and reusable UI components and directives under `src/app/shared/`. `features/gameplay` owns the viewport, overlays, loading, and session lifecycle; `features/debug` owns the debug panel and FPS counter. Services stay alongside the feature they serve.

`core/game-runtime/GameRuntimeService` is the Angular entry point to `src/game/runtime/`. It exposes the current seed, statistics, and debug control state through read-only signals. Debug reads those signals directly; `GameSessionService` manages startup, loading, and shutdown without depending on debug services.

The game code lives in `src/game/`, independently of Angular:

```text
game/
  gameplay/     # Entities, managers, player commands, combat, projectiles, world/chunk/spawn rules
  rendering/    # Babylon views, assets, physical queries, meshes, animations, camera, lighting
  input/        # Browser keyboard, pointer, and virtual joystick
  runtime/      # Startup/shutdown, dependency wiring, frame loop, statistics, debug, seed creation
  math/         # Shared numeric helpers, plain coordinates, deterministic random calculations
```

Gameplay depends only on gameplay and math modules. It contains no Angular, Babylon, or browser APIs. `Character`, `Player`, `Enemy`, and `Projectile` own movement decisions, firing, damage, death, and projectile lifetime. `Player` and `Enemy` extend `Character`. Enemy and projectile managers also live in gameplay. These entities receive physical and visual operations through `CharacterBody`, `PlayerBody`, and `ProjectileBody`, using plain coordinates. Rendering implements those interfaces with `CharacterView`, `PlayerView`, and `ProjectileView`; it contains no entity or combat logic.

`Game` owns one gameplay session, its entities, player commands, and world updates. Its `GameDependencies` groups the clock, scheduler, body factory, physical queries, and world presentation into separate contracts. `GamePresentation` provides `bodies`, `physics`, and `world`; runtime supplies `clock` and `scheduler`. Runtime creates `GamePresentation`, `GameLifetime`, and `Game` instances with constructors, forwards input snapshots to `game.update`, and disposes the session. `GameSeed` creates and applies a random seed, exposed through its `value` property. ESLint prevents rendering from importing gameplay implementations and runtime from accessing individual entities/managers. The gameplay and math modules are also type-checked without the DOM library in the test suite.

Types and configuration live beside their domain: player statistics and speed in `gameplay/player`, world dimensions and placement settings in `gameplay/world`, and loading batches in `rendering/scene`. Files containing only interfaces or type aliases use the `.interface.ts` suffix. Gameplay owns spawn coordinates, character identifiers, chunk selection, enemy spawning, and remembered enemy deaths. World placement receives random functions and configuration explicitly; `WorldRenderer` draws the chunks requested by gameplay, while its render queue manages progressive rendering. `WorldView` handles the camera and obstacle transparency.

Each game session owns its cancellation signal, loading notifications, subscriptions, and deferred work. Stopping a session releases input listeners, Babylon resources, asset containers, and manager instances. A pending asset request may finish after cancellation, but its result is disposed without resuming the old session.
