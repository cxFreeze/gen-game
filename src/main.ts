import { DracoCompression, Engine, Scene } from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
import { Inspector } from '@babylonjs/inspector';
import '@babylonjs/loaders/glTF';
import { PlayerInputs as PlayerInputs3D } from './3d/game/player-inputs.js';
import { PlayerMovements as PlayerMovements3D } from './3d/game/player-movements.js';
import { ShadersManager } from './3d/shaders.js';
import { AssetManager as AssetManager3D } from './3d/world/assets.js';
import { PlayerManager as PlayerManager3D } from './3d/world/player.js';
import { WorldManager as WorldManager3D } from './3d/world/world.js';
import { Random } from './utils/random.js';


const showInspector = false;


(async () => {
    Random.setSeed();
    await init3DApp();
    setTimeout(() => {
        hideLoadingScreen();
    }, 2000);
})();


function hideLoadingScreen() {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = 'none';
    }
}

DracoCompression.Configuration = {
    decoder: {
        wasmUrl: './babylon-draco-files/draco_wasm_wrapper_gltf.js',
        wasmBinaryUrl: './babylon-draco-files/draco_decoder_gltf.wasm',
        fallbackUrl: './babylon-draco-files/draco_decoder_gltf.js',
    },
};

async function init3DApp() {
    ShadersManager.loadShaders();
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);

    scene.useRightHandedSystem = true;

    scene.collisionsEnabled = true;

    if (showInspector) {
        Inspector.Show(scene, {
            handleResize: true,
            overlay: true,
            globalRoot: document.getElementById('#root') || undefined,
        });
    }

    WorldManager3D.createLightning();

    await AssetManager3D.loadAssets(scene);

    PlayerManager3D.createPlayer(scene);
    WorldManager3D.createWorld(scene);

    PlayerInputs3D.init();
    WorldManager3D.generateWorld();

    const divFps = document.getElementById('fps') as HTMLElement;

    engine.runRenderLoop(() => {
        scene.render();
        const time = engine.getDeltaTime();
        PlayerInputs3D.checkJoystick();
        PlayerMovements3D.updatePlayerPosition(time);

        divFps.innerHTML = `${engine.getFps().toFixed()} fps`;
    });

    window.addEventListener('resize', () => {
        engine.resize();
    });
}