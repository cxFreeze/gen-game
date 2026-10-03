import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Collisions/collisionCoordinator.js';
import { loadTypeScript } from './load-typescript.mjs';

test('player view keeps physical accessors live and releases its meshes without gameplay logic', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        let animationDisposals = 0;
        const { CharacterView } = loadTypeScript('../src/game/rendering/characters/character-view.ts', {
            '../../runtime/game-runtime': { GameRuntime: { scene } },
            '../animation/assets-utils': { AssetUtils: { rotateMeshY: () => ({ unsubscribe: () => animationDisposals++ }) } },
        });
        const source = MeshBuilder.CreateBox('player-model', {}, scene);
        const { PlayerView } = loadTypeScript('../src/game/rendering/characters/player-view.ts', {
            '../../runtime/game-runtime': { GameRuntime: { scene } },
            '../assets/assets': { AssetManager: { getWorldAsset: () => ({ mesh: source, scale: 1, sizeY: 2, animations: {} }) } },
            '../lighting/lighting': { LightingManager: { getInstance: () => ({ shadowGenerator: { addShadowCaster() {} } }) } },
            './character-view': { CharacterView },
        });
        let disposals = 0;
        const view = new PlayerView({ x: 10, y: 0, z: 20 }, 250, {
            getProjectileMesh: () => undefined,
            removeCharacter: () => disposals++,
        });
        const movement = [];
        view.playerMoved$.subscribe(value => movement.push(value));
        view.translate(1, 2);
        assert.equal(view.position.x, 11);
        assert.equal(view.position.z, 22);
        view.rotation = Math.PI;
        assert.equal(view.mesh.rotation.y, Math.PI);
        view.rotate(0);
        view.present({ hasMoved: true, isMoving: true, movementSpeed: 85, aimDirection: 0, isFiring: true });
        assert.deepEqual(movement, [false, true]);
        assert.equal(scene.getMeshByName('noproj-aimLine').isVisible, true);
        assert.equal(view.fire, undefined);
        assert.equal(view.takeDamage, undefined);
        view.dispose();
        view.dispose();
        assert.equal(view.mesh.isDisposed(), true);
        assert.equal(scene.getMeshByName('noproj-aimLine'), null);
        assert.equal(disposals, 1);
        assert.equal(animationDisposals, 1);
    }
    finally {
        scene.dispose();
        engine.dispose();
    }
});
