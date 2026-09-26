import '@babylonjs/core/Animations/animatable';
import '@babylonjs/core/Collisions/collisionCoordinator';
import '@babylonjs/core/Debug/debugLayer';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/index.js';
import '@babylonjs/loaders/glTF';

export function configureBabylon() {
    DracoCompression.Configuration = {
        decoder: {
            wasmUrl: './babylon-draco-files/draco_wasm_wrapper_gltf.js',
            wasmBinaryUrl: './babylon-draco-files/draco_decoder_gltf.wasm',
            fallbackUrl: './babylon-draco-files/draco_decoder_gltf.js',
        },
    };
}
