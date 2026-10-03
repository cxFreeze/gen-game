import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { AssetContainer } from '@babylonjs/core/assetContainer.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import { loadTypeScript } from './load-typescript.mjs';

function createAssets(loadAssetContainerAsync) {
    class Mesh {}
    class Asset {
        constructor(name, mesh) {
            this.name = name;
            this.mesh = mesh;
        }
    }
    const { AssetManager } = loadTypeScript('../src/game/rendering/assets/assets.ts', {
        '@babylonjs/core/Loading/sceneLoader.js': { loadAssetContainerAsync },
        '@babylonjs/core/Meshes/mesh.js': { Mesh },
        '../../runtime/game-runtime': { GameRuntime: { scene: {} } },
        '../../gameplay/world/world-config': { worldConfig: { chunkSize: 500 } },
        '../../gameplay/world/world-types': { BiomeType: { forest: 1 }, ZoneType: { town: 1 } },
        '../../math/random': { Random: {} },
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

test('ground assets survive a menu preview created during game asset loading', async t => {
    const gameEngine = new NullEngine();
    const gameScene = new Scene(gameEngine);
    const runtime = { GameRuntime: { scene: gameScene } };
    const assetClasses = loadTypeScript('../src/game/rendering/assets/gg-asset.ts', {
        '../../runtime/game-runtime': runtime,
    });
    const { BiomeType } = loadTypeScript('../src/game/gameplay/world/world-types.ts');
    let resolvePlayer;
    const playerRequest = new Promise(resolve => resolvePlayer = resolve);
    function createContainer(scene) {
        const container = new AssetContainer(scene);
        container.meshes.push(new Mesh('root', scene), MeshBuilder.CreateBox('model', {}, scene));
        return container;
    }
    const { AssetManager } = loadTypeScript('../src/game/rendering/assets/assets.ts', {
        '../../runtime/game-runtime': runtime,
        './gg-asset': assetClasses,
        '@babylonjs/core/Loading/sceneLoader.js': {
            loadAssetContainerAsync: async (path, scene) => path.endsWith('/player.glb') ? playerRequest : createContainer(scene),
        },
        '@babylonjs/core/Materials/Textures/texture.js': {
            Texture: class extends Texture {
                constructor(_path, scene) {
                    super(null, scene);
                }
            },
        },
        '@babylonjs/core/Sprites/spriteManager.js': { SpriteManager: class {} },
    });
    AssetManager.loadTownAssets = async () => {};
    AssetManager.loadEnemyAssets = async () => {};
    const loading = AssetManager.loadAssets(new AbortController().signal);
    const previewEngine = new NullEngine();
    const previewScene = new Scene(previewEngine);
    t.after(() => {
        AssetManager.dispose();
        previewEngine.dispose();
        gameEngine.dispose();
    });
    resolvePlayer(createContainer(gameScene));
    await loading;

    const grounds = [AssetManager.getWorldAsset('ocean'), AssetManager.getFirstAsset(BiomeType.forest, 'ground')];
    const instances = grounds.map(asset => asset.mesh.createInstance(`instance-${asset.name}`));
    for (const asset of grounds) {
        assert.equal(asset.mesh.getScene() === gameScene, true, `${asset.name} must belong to the game scene`);
        assert.equal(asset.mesh.material.getScene() === gameScene, true);
        assert.equal(asset.mesh.material.diffuseTexture.getScene() === gameScene, true);
        assert.equal(previewScene.meshes.includes(asset.mesh), false);
    }

    previewEngine.dispose();
    for (const mesh of [...grounds.map(asset => asset.mesh), ...instances]) {
        assert.equal(mesh.getScene() === gameScene, true);
        assert.equal(mesh.isDisposed(), false, `${mesh.name} must survive closing the preview`);
    }
});
