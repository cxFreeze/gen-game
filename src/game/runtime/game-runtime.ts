import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene, ScenePerformancePriority } from '@babylonjs/core/scene.js';
import { EMPTY, of } from 'rxjs';
import { PlayerInputs } from '../input/player-inputs';
import { Game } from '../gameplay/game';
import { GamePresentation } from '../rendering/game-presentation';
import { AssetManager } from '../rendering/assets/assets';
import { LightingManager } from '../rendering/lighting/lighting';
import { WorldView } from '../rendering/camera/world-view';
import { WorldRenderer } from '../rendering/world/world-renderer';
import { configureBabylon } from '../rendering/scene/babylon-configuration';
import { DebugManager } from './debug';
import { GameLifetime } from './game-lifetime';
import { publishDebugStats, resetDebugStats } from './game-observables';
import { Performance } from '../rendering/scene/performance';

export class GameRuntime {
    private static readonly resizeHandler = () => this._engine?.resize();
    private static lifetime: GameLifetime | undefined;
    private static game: Game | undefined;
    private static presentation: GamePresentation | undefined;
    private static debugManager: DebugManager | undefined;

    public static get debug() {
        if (!this.debugManager) {
            throw new Error('The game debug controls are not initialized');
        }
        return this.debugManager;
    }

    public static get hideLoadingScreen$() {
        return this.lifetime?.loaded$ ?? EMPTY;
    }

    public static get disposed$() {
        return this.lifetime?.disposed$ ?? of(undefined);
    }

    public static get isReady() {
        return this.lifetime?.isReady ?? false;
    }

    public static finishLoading() {
        this.lifetime?.finishLoading();
    }

    public static schedule(callback: () => void, milliseconds: number) {
        this.lifetime?.schedule(callback, milliseconds);
    }

    private static _scene: Scene | undefined;
    public static get scene() {
        if (!this._scene) {
            throw new Error('The game scene is not initialized');
        }
        return this._scene;
    }

    private static _engine: Engine | undefined;
    public static get engine() {
        if (!this._engine) {
            throw new Error('The game engine is not initialized');
        }
        return this._engine;
    }

    public static async start(canvas: HTMLCanvasElement) {
        this.dispose();
        const lifetime = new GameLifetime();
        this.lifetime = lifetime;

        try {
            await this.initialize(canvas, lifetime.signal);
        }
        catch (error: unknown) {
            if (this.lifetime === lifetime) {
                this.dispose();
            }
            throw error;
        }
    }

    private static async initialize(canvas: HTMLCanvasElement, signal: AbortSignal) {
        configureBabylon();
        const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this._engine = engine;
        const scene = new Scene(engine, { useGeometryUniqueIdsMap: true });
        this._scene = scene;

        this._scene.useRightHandedSystem = true;
        this._scene.collisionsEnabled = true;
        this._scene.performancePriority = ScenePerformancePriority.Intermediate;
        this._scene.blockMaterialDirtyMechanism = true;

        Performance.setPerformance(this.engine.getFps());

        const lightingManager = LightingManager.getInstance();
        lightingManager.createLightning();
        await AssetManager.loadAssets(signal);
        signal.throwIfAborted();


        const presentation = new GamePresentation();
        this.presentation = presentation;
        const game = new Game(presentation);
        this.game = game;

        const worldManager = new WorldView(presentation.playerView);

        worldManager.generateWorld();
        this.debugManager = new DebugManager(presentation.playerView, worldManager);
        PlayerInputs.init(canvas);

        engine.runRenderLoop(() => {
            if (signal.aborted) {
                return;
            }
            scene.render(false);
            const time = engine.getDeltaTime();
            PlayerInputs.checkInputs();
            worldManager.present(game.update(PlayerInputs.getCommands(), time));

            if (engine.frameId % 10 === 0) {
                publishDebugStats({
                    fps: Math.round(engine.getFps()),
                    worldX: worldManager.worldX,
                    worldY: worldManager.worldY,
                    meshCount: scene.meshes.length,
                    polygonCount: Math.round(scene.getTotalVertices() / 3),
                });
            }
        });

        window.addEventListener('resize', this.resizeHandler);
    }

    public static dispose() {
        window.removeEventListener('resize', this.resizeHandler);
        this._engine?.stopRenderLoop();
        this.lifetime?.dispose();
        this.lifetime = undefined;
        this.game?.dispose();
        this.game = undefined;
        this.presentation?.dispose();
        this.presentation = undefined;
        PlayerInputs.dispose();
        this.debugManager = undefined;
        WorldRenderer.dispose();
        LightingManager.dispose();
        Performance.dispose();
        AssetManager.dispose();
        this._scene?.dispose();
        this._engine?.dispose();
        this._scene = undefined;
        this._engine = undefined;
        resetDebugStats();
    }
}
