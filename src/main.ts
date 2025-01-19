import '@babylonjs/core/Animations/animatable';
import '@babylonjs/core/Collisions/collisionCoordinator';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/index.js';
import '@babylonjs/loaders/glTF';
import { App } from './core/app.js';
import { Random } from './utils/random.js';

DracoCompression.Configuration = {
    decoder: {
        wasmUrl: './babylon-draco-files/draco_wasm_wrapper_gltf.js',
        wasmBinaryUrl: './babylon-draco-files/draco_decoder_gltf.wasm',
        fallbackUrl: './babylon-draco-files/draco_decoder_gltf.js',
    },
};

window.onload = () => {
    Random.setSeed();
    App.initApp();

    App.hideLoadingScreen$.subscribe(() => {
        hideLoadingScreen();
    });
};

function hideLoadingScreen() {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = 'none';
    }
}

