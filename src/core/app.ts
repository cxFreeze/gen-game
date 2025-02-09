import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene, ScenePerformancePriority } from '@babylonjs/core/scene';
import { delay, Subject, take } from 'rxjs';
import { PlayerInputs } from '../game/player-inputs';
import { PlayerMovements } from '../game/player-movements';
import { AssetManager } from '../world/assets';
import { LightingManager } from '../world/lighting';
import { PlayerManager } from '../world/player';
import { WorldManager } from '../world/world';
import { Params } from './params';
import { Performance } from './performance';


export class App {
    private static _hideLoadingScreenSubject = new Subject<void>();
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

    public static async initApp() {
        Params.initPlayerInitPos();
        const canvas = document.getElementById('render-canvas');
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Render canvas not found or is not a canvas element');
        }

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


        const playerManager = PlayerManager.getInstance();
        playerManager.createPlayer();

        const worldManager = WorldManager.getInstance();
        const playerMovements = PlayerMovements.getInstance();

        worldManager.generateWorld();
        PlayerInputs.init();

        this._engine.runRenderLoop(() => {
            this._scene.render();
            const time = this._engine.getDeltaTime();
            PlayerInputs.checkJoystick();
            playerMovements.updatePlayerPosition(time);
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
}