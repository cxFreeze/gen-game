# WORK IN PROGRESS

live demo : https://cxfreeze.github.io/gen-game/

## Development

This project uses Angular 22 with standalone components, signals, and zoneless change detection. `zone.js` is not installed.

- `npm start`: start the Angular development server
- `npm run build`: create the production bundle in `dist/`

The Angular shell is split between `CanvasComponent`, which owns the Babylon.js canvas and lifecycle, and `UiComponent`, which renders the loading and debug overlays from `GameUiStore` signals.
