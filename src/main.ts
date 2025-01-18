import { DracoCompression } from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer';
import '@babylonjs/inspector';
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

    setTimeout(() => {
        hideLoadingScreen();
    }, 2000);
};

function hideLoadingScreen() {
    const el = document.getElementById('loading');
    if (el) {
        el.style.display = 'none';
    }
}

