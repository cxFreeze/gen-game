import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene, ScenePerformancePriority } from '@babylonjs/core/scene';
import { delay, Subject, take } from 'rxjs';
import { EmeniesManager } from '../game/enemies';
import { Player } from '../game/player';
import { PlayerInputs } from '../game/player-inputs';
import { PlayerMovements } from '../game/player-movements';
import { ProjectilesManager } from '../game/projectiles';
import { AssetManager } from '../world/assets';
import { LightingManager } from '../world/lighting';
import { WorldManager } from '../world/world';
import { Params } from './params';
import { Performance } from './performance';

export interface GameStats {
    fps: number;
    worldX: number;
    worldY: number;
    meshCount: number;
    polygonCount: number;
}

export class App {
    private static readonly resizeHandler = () => this._engine.resize();

    private static readonly _hideLoadingScreenSubject = new Subject<void>();
    public static get hideLoadingScreenSubject() {
        return this._hideLoadingScreenSubject;
    }

    public static get hideLoadingScreen$() {
        return this._hideLoadingScreenSubject.pipe(delay(500), take(1));
    }

    private static _scene: Scene;
    public static get scene() {
        return this._scene;
    }

    private static _engine: Engine;
    public static get engine() {
        return this._engine;
    }

    public static async initApp(canvas: HTMLCanvasElement, updateStats: (stats: GameStats) => void) {
        Params.initPlayerInitPos();
        this._engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this._scene = new Scene(this._engine, { useGeometryUniqueIdsMap: true });

        this._scene.useRightHandedSystem = true;
        this._scene.collisionsEnabled = true;
        this._scene.performancePriority = ScenePerformancePriority.Intermediate;
        this._scene.blockMaterialDirtyMechanism = true;

        Performance.setPerformance(this.engine.getFps());

        const lightingManager = LightingManager.getInstance();
        lightingManager.createLightning();
        await AssetManager.loadAssets();


        const playerManager = Player.getInstance();
        playerManager.createPlayer();

        const projectilesManager = ProjectilesManager.getInstance();
        const emeniesManager = EmeniesManager.getInstance();

        const worldManager = WorldManager.getInstance();
        const playerMovements = PlayerMovements.getInstance();

        worldManager.generateWorld();
        PlayerInputs.init();

        this._engine.runRenderLoop(() => {
            this._scene.render(false);
            const time = this._engine.getDeltaTime();
            PlayerInputs.checkInputs();
            playerMovements.updatePlayerPosition(time);

            projectilesManager.updatePositions();
            emeniesManager.updateEnemies(time);

            if (this._engine.frameId % 10 === 0) {
                updateStats({
                    fps: Math.round(this._engine.getFps()),
                    worldX: worldManager.worldX,
                    worldY: worldManager.worldY,
                    meshCount: this._scene.meshes.length,
                    polygonCount: Math.round(this._scene.getTotalVertices() / 3),
                });
            }
        });

        window.addEventListener('resize', this.resizeHandler);
    }

    public static disposeApp() {
        window.removeEventListener('resize', this.resizeHandler);
        this._engine?.dispose();
    }
}