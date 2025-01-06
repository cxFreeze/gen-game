import { Engine, Scene } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { Debug } from './debug';
import { PlayerInputs } from './game/player-inputs';
import { PlayerMovements } from './game/player-movements';
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
        const canvas = document.getElementById('renderCanvas');
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

        if (Debug.showFps) {
            const divFps = document.getElementById('fps') as HTMLElement;
            this._engine.runRenderLoop(() => {
                if (this._engine.frameId % 10 === 0) {
                    divFps.innerHTML = `${this._engine.getFps().toFixed()} fps`;
                }
            });
        }

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
}