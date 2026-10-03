import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
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

function createDeathView(t, meshFactory) {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.getAnimationRatio = () => 1;
    t.after(() => {
        scene.dispose();
        engine.dispose();
    });
    const { CharacterView } = loadTypeScript('../src/game/rendering/characters/character-view.ts', {
        '../../runtime/game-runtime': { GameRuntime: { scene } },
        '../animation/assets-utils': { AssetUtils: { rotateMeshY() {} } },
    });
    const mesh = meshFactory(scene);
    let removals = 0;
    const view = new CharacterView(mesh, { removeCharacter: () => removals++ });
    return { scene, mesh, view, getRemovals: () => removals };
}

// NullEngine does not draw: advance Babylon's particle simulation and signal a draw explicitly.
function renderDeathFrame(scene, particles) {
    particles.animate(true);
    if (particles.getActiveCount() > 0) {
        particles.onBeforeDrawParticlesObservable.notifyObservers(null);
    }
    scene.onAfterRenderObservable.notifyObservers(scene);
}

test('death cloud follows scaled, rotated model bounds and covers the model before hiding it', t => {
    const { scene, mesh, view, getRemovals } = createDeathView(t, scene => {
        const source = MeshBuilder.CreateBox('enemy-model', { width: 2, height: 6, depth: 3 }, scene);
        source.isVisible = false;
        const mesh = source.createInstance('char-enemy');
        mesh.position.set(30, 12, -40);
        mesh.scaling.set(2, 3, 4);
        mesh.rotation.y = Math.PI / 3;
        const accessory = MeshBuilder.CreateBox('accessory', { size: 2 }, scene);
        accessory.parent = mesh;
        accessory.position.y = 4;
        return mesh;
    });
    mesh.computeWorldMatrix(true);
    const bounds = mesh.getHierarchyBoundingVectors();
    view.showDeath();
    view.showDeath();
    const [particles] = scene.particleSystems;
    assert.equal(scene.particleSystems.length, 1);
    assert.equal(mesh.isEnabled(), true);
    assert.equal(mesh.isDisposed(), false);
    assert.equal(mesh.checkCollisions, false);
    assert.equal(mesh.isPickable, false);
    assert.equal(mesh.getChildMeshes()[0].checkCollisions, false);
    assert.equal(mesh.getChildMeshes()[0].isPickable, false);
    assert.equal(getRemovals(), 0);
    const size = bounds.max.subtract(bounds.min);
    const center = bounds.min.add(bounds.max).scale(0.5);
    assert.ok(particles.emitter.equalsWithEpsilon(center));
    for (const axis of ['x', 'y', 'z']) {
        const cloudSize = particles.maxEmitBox[axis] - particles.minEmitBox[axis] + particles.maxSize;
        assert.ok(Math.abs(cloudSize - size[axis]) < 1e-8, `Cloud must match model size on ${axis}`);
    }

    // Shader compilation or a missing draw must not hide the model.
    for (let frame = 0; frame < 12; frame++) {
        scene.onAfterRenderObservable.notifyObservers(scene);
    }
    assert.equal(mesh.isEnabled(), true);
    for (let frame = 0; frame < 7; frame++) {
        renderDeathFrame(scene, particles);
        assert.equal(mesh.isEnabled(), true);
    }
    assert.equal(particles.getActiveCount(), particles.getCapacity());
    assert.ok(particles.particles.every(particle => particle.size >= particles.minSize && particle.size <= particles.maxSize));
    renderDeathFrame(scene, particles);
    assert.equal(mesh.isEnabled(), false);
    assert.equal(mesh.isDisposed(), false);
    assert.ok(particles.particles.every(particle => particle.color.a === 1), 'Cloud must remain opaque while hiding the model');

    for (let frame = 0; frame < 30; frame++) {
        renderDeathFrame(scene, particles);
    }
    assert.ok(particles.particles.some(particle => particle.color.a > 0 && particle.color.a < 1));
    assert.ok(particles.particles.some(particle => particle.size > particles.maxSize));
    for (let frame = 0; frame < 50 && !mesh.isDisposed(); frame++) {
        renderDeathFrame(scene, particles);
    }
    assert.equal(mesh.isDisposed(), true);
    assert.equal(getRemovals(), 1);
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.textures.length, 0);
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
});

test('covering particles sit in front of opaque geometry until the model is hidden', t => {
    const { scene, mesh, view } = createDeathView(t, scene => {
        const mesh = MeshBuilder.CreateBox('char-solid', { width: 4, height: 12, depth: 6 }, scene);
        mesh.position.set(25, 6, -30);
        const camera = new UniversalCamera('camera', new Vector3(25, 80, -120), scene);
        camera.setTarget(mesh.position);
        camera.getViewMatrix(true);
        scene.activeCamera = camera;
        return mesh;
    });
    const bounds = mesh.getHierarchyBoundingVectors();
    view.showDeath();
    const [particles] = scene.particleSystems;
    for (let frame = 0; frame < 8; frame++) {
        renderDeathFrame(scene, particles);
        assert.ok(particles.particles.every(particle => {
            return particle.position.y > bounds.max.y || particle.position.z < bounds.min.z;
        }), 'Particles must cover the front of the model instead of being hidden inside it');
    }
    assert.equal(mesh.isEnabled(), false);
    assert.ok(particles.particles.every(particle => particle.color.a === 1));
});

test('player death stops its animation and aim indicator before the model disappears', t => {
    const { scene, view: characterView } = createDeathView(t, scene => MeshBuilder.CreateBox('player-model', {}, scene));
    const source = characterView.mesh;
    let animationStops = 0;
    const { PlayerView } = loadTypeScript('../src/game/rendering/characters/player-view.ts', {
        '../../runtime/game-runtime': { GameRuntime: { scene } },
        '../assets/assets': { AssetManager: { getWorldAsset: () => ({
            mesh: source, scale: 1, sizeY: 2,
            animations: { Idle: { isStarted: true, stop: () => animationStops++ } },
        }) } },
        '../lighting/lighting': { LightingManager: { getInstance: () => ({ shadowGenerator: { addShadowCaster() {} } }) } },
        './character-view': { CharacterView: characterView.constructor },
    });
    let removals = 0;
    const view = new PlayerView({ x: 10, y: 0, z: 20 }, 250, { removeCharacter: () => removals++ });
    view.present({ hasMoved: false, isMoving: false, movementSpeed: 85, aimDirection: 0, isFiring: true });
    const aimLine = scene.getMeshByName('noproj-aimLine');
    assert.equal(aimLine.isVisible, true);
    view.showDeath();
    assert.equal(animationStops, 1);
    assert.equal(aimLine.isVisible, false);
    assert.equal(view.mesh.isEnabled(), true);
    assert.equal(removals, 0);
    const [particles] = scene.particleSystems;
    for (let frame = 0; frame < 90 && !view.mesh.isDisposed(); frame++) {
        renderDeathFrame(scene, particles);
    }
    assert.equal(view.mesh.isDisposed(), true);
    assert.equal(aimLine.isDisposed(), true);
    assert.equal(removals, 1);
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.textures.length, 0);
});

test('disposing a character during death releases its cloud and render observer immediately', t => {
    const { scene, mesh, view, getRemovals } = createDeathView(t, scene => MeshBuilder.CreateBox('player', {}, scene));
    view.showDeath();
    renderDeathFrame(scene, scene.particleSystems[0]);
    view.dispose();
    view.dispose();
    scene.onAfterRenderObservable.notifyObservers(scene);
    assert.equal(mesh.isDisposed(), true);
    assert.equal(getRemovals(), 1);
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.textures.length, 0);
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
});
