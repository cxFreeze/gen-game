import { Engine, Scene } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { PlayerInputs } from './3d/game/player-inputs';
import { PlayerMovements } from './3d/game/player-movements';
import { AssetManager } from './3d/world/assets';
import { LightingManager } from './3d/world/lighting';
import { PlayerManager } from './3d/world/player';
import { WorldManager } from './3d/world/world';

export abstract class App {

    private static _scene: Scene;
    public static get scene() {
        return this._scene;
    }

    private static _engine: Engine;
    public static get engine() {
        return this._engine;
    }

    private static showInspector = false;

    public static async init3DApp() {
        const canvas = document.getElementById('renderCanvas');
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Render canvas not found or is not a canvas element');
        }

        this._engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
        this._scene = new Scene(this._engine);

        this._scene.useRightHandedSystem = true;
        this._scene.collisionsEnabled = true;

        if (this.showInspector) {
            Inspector.Show(this._scene, {
                handleResize: true,
                overlay: true,
                globalRoot: document.getElementById('#root') || undefined,
            });
        }

        LightingManager.createLightning();

        await AssetManager.loadAssets();

        PlayerManager.createPlayer();
        WorldManager.createWorld();
        PlayerInputs.init();
        WorldManager.generateWorld();

        const divFps = document.getElementById('fps') as HTMLElement;

        this._engine.runRenderLoop(() => {
            this._scene.render();
            const time = this._engine.getDeltaTime();
            PlayerInputs.checkJoystick();
            PlayerMovements.updatePlayerPosition(time);

            divFps.innerHTML = `${this._engine.getFps().toFixed()} fps`;
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }
}