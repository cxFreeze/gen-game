import { Engine, Scene } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { Debug } from './debug';
import { PlayerInputs } from './game/player-inputs';
import { PlayerMovements } from './game/player-movements';
import { Params } from './params';
import { AssetManager } from './world/assets';
import { LightingManager } from './world/lighting';
import { PlayerManager } from './world/player';
import { WorldManager } from './world/world';

export class App {

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
        this._scene = new Scene(this._engine);

        this._scene.useRightHandedSystem = true;
        this._scene.collisionsEnabled = true;


        const lightingManager = LightingManager.getInstance();
        lightingManager.createLightning();
        await AssetManager.loadAssets();

        const playerManager = PlayerManager.getInstance();
        playerManager.createPlayer();
        const worldManager = WorldManager.getInstance();
        const playerMovements = PlayerMovements.getInstance();

        if (Debug.showInspector) {
            Inspector.Show(this._scene, {
                handleResize: true,
                overlay: true,
                globalRoot: document.getElementById('#root') || undefined,
            });
        }

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