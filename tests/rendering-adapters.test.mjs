import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import '@babylonjs/core/Collisions/collisionCoordinator.js';
import { EMPTY, NEVER } from 'rxjs';
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

test('camera FXAA stays on the game engine when a newer menu preview is disposed', t => {
    const gameEngine = new NullEngine();
    const gameScene = new Scene(gameEngine);
    const previewEngine = new NullEngine();
    new Scene(previewEngine);
    t.after(() => {
        previewEngine.dispose();
        gameEngine.dispose();
    });
    const { WorldView } = loadTypeScript('../src/game/rendering/camera/world-view.ts', {
        '../../runtime/game-runtime': {
            GameRuntime: { scene: gameScene, engine: gameEngine, hideLoadingScreen$: EMPTY, disposed$: NEVER },
        },
        '../lighting/lighting': { LightingManager: { getInstance: () => ({ setSunPosition() {} }) } },
    });
    const player = MeshBuilder.CreateBox('player', {}, gameScene);
    const view = new WorldView({ position: Vector3.Zero(), mesh: player });
    view.generateWorld();

    const fxaa = gameScene.postProcesses.find(postProcess => postProcess.name === 'fxaa');
    assert.ok(fxaa);
    assert.equal(fxaa.getEngine() === gameEngine, true);
    assert.equal(fxaa._effectWrapper.options.engine === gameEngine, true, 'FXAA shaders must use the same engine as the game camera');

    previewEngine.dispose();
    assert.equal(fxaa._effectWrapper.options.engine.isDisposed, false);
    assert.equal(gameScene.activeCamera._postProcesses.includes(fxaa), true);
});
