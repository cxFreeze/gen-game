import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MenuView } from '../rendering/menu/menu-view';
import { configureBabylon } from '../rendering/scene/babylon-configuration';

/** Owns the menu preview's engine, scene, and cancellation independently of the game. */
export class MenuRuntime {
    private readonly controller = new AbortController();
    private engine: Engine | undefined;
    private scene: Scene | undefined;
    private view: MenuView | undefined;
    private resizeObserver: ResizeObserver | undefined;

    constructor(private readonly canvas: HTMLCanvasElement) { }

    async start() {
        const signal = this.controller.signal;
        signal.throwIfAborted();
        configureBabylon();

        try {
            const engine = new Engine(this.canvas, true, { alpha: true });
            this.engine = engine;
            const scene = new Scene(engine);
            this.scene = scene;
            scene.useRightHandedSystem = true;
            const view = new MenuView(scene);
            this.view = view;
            await view.load(signal);
            signal.throwIfAborted();

            const resize = () => {
                if (signal.aborted) {
                    return;
                }
                engine.resize();
                view.resize();
            };
            resize();
            this.resizeObserver = new ResizeObserver(resize);
            this.resizeObserver.observe(this.canvas);
            engine.runRenderLoop(() => {
                if (!signal.aborted) {
                    scene.render();
                }
            });
        }
        catch (error: unknown) {
            this.dispose();
            throw error;
        }
    }

    dispose() {
        if (this.controller.signal.aborted) {
            return;
        }
        this.controller.abort();
        this.resizeObserver?.disconnect();
        this.engine?.stopRenderLoop();
        this.view?.dispose();
        this.scene?.dispose();
        this.engine?.dispose();
        this.resizeObserver = undefined;
        this.view = undefined;
        this.scene = undefined;
        this.engine = undefined;
    }
}
