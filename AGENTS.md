
# GenGame

## Project Overview

GenGame is a 3D game with Angular UI

## Behavior

- do not build or open the app in a browser

## Tech Stack

- **Language**: TypeScript with strict mode
- **3D render**: Babylon.js v9
- **UI**: Angular v22

## Development Guidelines

### Code Style and Structure

- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError)
- Do not overcomplicate, overabstract the code

### Naming Conventions

- Use lowercase with dashes for directories (e.g., components/auth-wizard)
- Use lowercase with dashes for file names (e.g., `enemy-system.ts`, `player-view.ts`)
- Files containing only interfaces or type aliases must use the `.interface.ts` suffix (e.g., `enemy-type.interface.ts`, `asset-types.interface.ts`)
- Files containing implementation or runtime values keep a descriptive `.ts` name; do not use the `.interface.ts` suffix for mixed files
- Name class implementation files after their class in kebab-case (e.g., `EnemySystem` in `enemy-system.ts`, `ProjectileSystem` in `projectile-system.ts`)
- Favor named exports for components
- Use PascalCase for component names
- Use camelCase for functions, variables, and props

### Architecture Boundaries

- `src/app/` is the Angular application. It owns the UI and communication with the game through services; game rules and Babylon rendering do not belong here
- `src/game/gameplay/` contains game logic: entities, movement decisions, combat, spawning, and world rules. It must not depend on Angular, Babylon.js, rendering, or runtime, including through type-only imports
- Gameplay communicates with technical implementations through interfaces and plain data defined in gameplay or math
- `src/game/rendering/` contains Babylon.js rendering, meshes, assets, animation, cameras, lighting, and implementations of the physical interfaces used by gameplay
- `src/game/runtime/` coordinates startup, shutdown, the game loop, and dependency wiring. Babylon.js engine and scene lifecycle management belongs here
- All Babylon.js dependencies must remain in `rendering/` or `runtime/`
- Rendering may import gameplay interfaces and data, but must not depend on gameplay entity implementations or own game rules
- Keep `src/game/` independent of Angular

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
- `NgOptimizedImage` does not work for inline base64 images.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

# Final product

## Language

- The game must be in english
- Never speak directly to the player