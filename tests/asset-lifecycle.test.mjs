import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript } from './load-typescript.mjs';

function createAssets(loadAssetContainerAsync) {
    class Mesh {}
    class Asset {
        constructor(name, mesh) {
            this.name = name;
            this.mesh = mesh;
        }
    }
    const { AssetManager } = loadTypeScript('../src/engine/assets/assets.ts', {
        '@babylonjs/core/Loading/sceneLoader.js': { loadAssetContainerAsync },
        '@babylonjs/core/Meshes/mesh.js': { Mesh },
        '../runtime/game-runtime': { GameRuntime: { scene: {} } },
        '../runtime/params': { Params: { chunkSize: 500 } },
        '../world/world-types': { BiomeType: { forest: 1 }, ZoneType: { town: 1 } },
        '../utils/random': { Random: {} },
        './gg-asset': { GG3DAsset: Asset, GGSpriteAsset: Asset },
    });
    const container = () => ({
        meshes: [{}, new Mesh()],
        animationGroups: [],
        dispose() {
 this.isDisposed = true; 
},
    });
    return { AssetManager, container };
}

test('a cancelled asset request releases its result without overwriting a new session', async () => {
    let resolveOldRequest;
    const pending = new Promise(resolve => {
 resolveOldRequest = resolve; 
});
    let requestCount = 0;
    const { AssetManager, container } = createAssets(() => ++requestCount === 1 ? pending : Promise.resolve(newContainer));
    const newContainer = container();
    const oldController = new AbortController();
    const oldLoading = AssetManager.loadEnemyAssets(oldController.signal);
    const cancelled = assert.rejects(oldLoading, { name: 'AbortError' });
    oldController.abort();
    AssetManager.dispose();

    await AssetManager.loadEnemyAssets(new AbortController().signal);
    const newAsset = AssetManager.getEnemyAsset('blob');
    const oldContainer = container();
    resolveOldRequest(oldContainer);
    await cancelled;
    assert.equal(oldContainer.isDisposed, true);
    assert.equal(newContainer.isDisposed, undefined);
    assert.equal(AssetManager.getEnemyAsset('blob'), newAsset);
    AssetManager.dispose();
    assert.equal(newContainer.isDisposed, true);
    assert.throws(() => AssetManager.getEnemyAsset('blob'), /Asset not loaded/);
});

test('an already aborted session never starts an asset request', async () => {
    let requestCount = 0;
    const { AssetManager } = createAssets(() => {
 requestCount++; 
});
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(AssetManager.loadEnemyAssets(controller.signal), { name: 'AbortError' });
    assert.equal(requestCount, 0);
});
