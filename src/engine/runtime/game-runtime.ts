import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene, ScenePerformancePriority } from '@babylonjs/core/scene.js';
import { EMPTY, of } from 'rxjs';
import { EnemiesManager } from '../enemies/enemies';
import { Player } from '../player/player';
import { PlayerInputs } from '../player/player-inputs';
import { PlayerMovements } from '../player/player-movements';
import { ProjectilesManager } from '../projectiles/projectiles';
import { AssetManager } from '../assets/assets';
import { LightingManager } from '../world/lighting';
import { WorldManager } from '../world/world';
import { WorldGenerator } from '../world/world-generator';
import { configureBabylon } from './babylon-configuration';
import { DebugManager } from './debug';
import { createGameLifetime } from './game-lifetime';
import type { GameStats } from './game-stats';
import { Params } from './params';
import { Performance } from './performance';

export class GameRuntime {
    private static readonly resizeHandler = () => this._engine?.resize();
    private static lifetime: ReturnType<typeof createGameLifetime> | undefined;

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

    public static async start(canvas: HTMLCanvasElement, updateStats: (stats: GameStats) => void) {
        this.dispose();
        const lifetime = createGameLifetime();
        this.lifetime = lifetime;

        try {
            await this.initialize(canvas, updateStats, lifetime.signal);
        }
        catch (error: unknown) {
            if (this.lifetime === lifetime) {
                this.dispose();
            }
            throw error;
        }
    }

    private static async initialize(canvas: HTMLCanvasElement, updateStats: (stats: GameStats) => void, signal: AbortSignal) {
        configureBabylon();
        Params.enemyNameCount = 0;
        Params.initPlayerInitPos();
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


        const playerManager = Player.getInstance();
        playerManager.createPlayer();

        const projectilesManager = ProjectilesManager.getInstance();
        const enemiesManager = EnemiesManager.getInstance();

        const worldManager = WorldManager.getInstance();
        const playerMovements = PlayerMovements.getInstance();

        worldManager.generateWorld();
        PlayerInputs.init(canvas);

        engine.runRenderLoop(() => {
            if (signal.aborted) {
                return;
            }
            scene.render(false);
            const time = engine.getDeltaTime();
            PlayerInputs.checkInputs();
            playerMovements.updatePlayerPosition(time);

            projectilesManager.updatePositions();
            enemiesManager.updateEnemies(time);

            if (engine.frameId % 10 === 0) {
                updateStats({
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
        PlayerInputs.dispose();
        WorldManager.dispose();
        WorldGenerator.dispose();
        PlayerMovements.dispose();
        EnemiesManager.dispose();
        Player.dispose();
        ProjectilesManager.dispose();
        DebugManager.dispose();
        LightingManager.dispose();
        Performance.dispose();
        AssetManager.dispose();
        this._scene?.dispose();
        this._engine?.dispose();
        this._scene = undefined;
        this._engine = undefined;
    }
}
