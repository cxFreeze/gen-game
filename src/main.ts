import { Application } from 'pixi.js';
import { AssetManager } from './2d/world/assets.js';
import { PlayerMovements } from './2d/game/player-movements.js';
import { PlayerManager } from './2d/world/player.js';
import { WorldManager } from './2d/world/world.js';
import { PlayerInputs } from './2d/game/player-inputs.js';
import { Random } from './utils/random.js';

import 'babylonjs-loaders';
import { AssetManager as AssetManager3D } from './3d/world/assets.js';
import { PlayerMovements as PlayerMovements3D } from './3d/game/player-movements.js';
import { PlayerManager as PlayerManager3D } from './3d/world/player.js';
import { WorldManager as WorldManager3D } from './3d/world/world.js';
import { PlayerInputs as PlayerInputs3D } from './3d/game/player-inputs.js';
import { DracoCompression, Engine, HemisphericLight, Scene, Vector3 } from 'babylonjs';


(async () => {
    Random.setSeed();

    if (window.location.search.includes('2d')) {
        await init2DApp();
    }
    else {
        await init3DApp();
    }

    setTimeout(() => {
        hideLoadingScreen();
    }, 1000);
})();


function hideLoadingScreen() {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = 'none';
    }
}

async function init2DApp() {
    document.getElementById('renderCanvas')?.remove();

    // create the app
    const app = new Application();
    await app.init({ resizeTo: window, preference: 'webgpu' });

    await AssetManager.loadAssets();
    WorldManager.createWorld(app);
    PlayerManager.createPlayer();
    PlayerInputs.init();
    PlayerMovements.init();

    WorldManager.generateWorld();

    document.body.appendChild(app.canvas);

    app.ticker.add((time) => {
        PlayerMovements.updatePlayerPosition(time.elapsedMS);
        WorldManager.updateDebugInfos(time);
    });
}

DracoCompression.Configuration = {
    decoder: {
        wasmUrl: "./babylon-draco-files/draco_wasm_wrapper_gltf.js",
        wasmBinaryUrl: "./babylon-draco-files/draco_decoder_gltf.wasm",
        fallbackUrl: "./babylon-draco-files/draco_decoder_gltf.js",
    },
};

async function init3DApp() {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;

    scene.collisionsEnabled = true;

    new HemisphericLight('light1', new Vector3(0, 500, 0), scene);

    await AssetManager3D.loadAssets(scene);
    PlayerManager3D.createPlayer(scene);
    WorldManager3D.createWorld(scene);
    PlayerInputs3D.init();
    WorldManager3D.generateWorld();

    engine.runRenderLoop(() => {
        scene.render();
        const time = engine.getDeltaTime();
        PlayerMovements3D.updatePlayerPosition(time);

    });

    setInterval(() => {
        //console.log(PlayerManager3D.playerX, PlayerManager3D.playerY, 'count:', scene.meshes.length);
    }, 1000);


    window.addEventListener('resize', () => {
        engine.resize();
    });
}