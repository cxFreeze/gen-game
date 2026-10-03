import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { loadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/loaders/glTF/index.js';
import { loadTypeScript } from './load-typescript.mjs';

test('both forest flowers load at ground level and allow characters to overlap while rocks block space', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const runtime = { GameRuntime: { scene } };
    const assets = loadTypeScript('../src/game/rendering/assets/gg-asset.ts', {
        '../../runtime/game-runtime': runtime,
    });
    const { AssetManager } = loadTypeScript('../src/game/rendering/assets/assets.ts', {
        '../../runtime/game-runtime': runtime,
        './gg-asset': assets,
        '@babylonjs/core/Loading/sceneLoader.js': {
            loadAssetContainerAsync: path => loadAssetContainerAsync(
                readFileSync(new URL(`../public/${path}`, import.meta.url)), scene, { pluginExtension: '.glb' },
            ),
        },
        '@babylonjs/core/Sprites/spriteManager.js': { SpriteManager: class {} },
    });
    AssetManager.loadTextureAsset = () => ({ material: new StandardMaterial('ground', scene), texture: {} });
    try {
        await AssetManager.loadForestAssets(new AbortController().signal);
        const { WorldRenderer } = loadTypeScript('../src/game/rendering/world/world-renderer.ts', {
            '../../runtime/game-runtime': runtime,
            '../assets/assets': { AssetManager },
            '../assets/gg-asset': assets,
            '../lighting/lighting': { LightingManager: {} },
        });
        const renderer = Object.create(WorldRenderer.prototype);
        renderer.itemCnt = 0;
        renderer.lightingManager = { shadowGenerator: { addShadowCaster() {} } };
        renderer.placement = { getChunk: () => '0/0', isInWorldBounds: () => true };
        renderer.loadedChunksItems = { '0/0': { meshes: [], sprites: [] } };
        const character = MeshBuilder.CreateBox('character', { size: 20 }, scene);
        character.position.y = 10;
        character.computeWorldMatrix(true);

        const flowers = AssetManager.biomeAssets[1].flower;
        assert.equal(flowers.length, 2);
        for (const flower of flowers) {
            const mesh = renderer.drawItem(flower, 0, 0, 0);
            renderer.loadedChunksItems['0/0'].meshes = [{ mesh, asset: flower }];
            const bounds = mesh.getBoundingInfo().boundingBox;
            assert.ok(Math.abs(bounds.minimumWorld.y) < 0.001);
            assert.ok(Math.abs(bounds.maximumWorld.y - 12) < 0.001);
            assert.equal(mesh.checkCollisions, false);
            assert.equal(mesh.isPickable, false);
            assert.equal(mesh.intersectsMesh(character, true), true);
            assert.equal(renderer.isSpaceAvailable(character, 0, 0), true);
        }

        const rock = AssetManager.getFirstAsset(1, 'rock');
        const mesh = renderer.drawItem(rock, 0, 0, 0);
        renderer.loadedChunksItems['0/0'].meshes = [{ mesh, asset: rock }];
        assert.equal(renderer.isSpaceAvailable(character, 0, 0), false);
    }
    finally {
        AssetManager.dispose();
        scene.dispose();
        engine.dispose();
    }
});
