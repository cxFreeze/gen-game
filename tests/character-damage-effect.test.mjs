import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import '@babylonjs/core/Materials/standardMaterial.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { loadTypeScript } from './load-typescript.mjs';

function createView(t, isPlayer = false) {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    let animationRatio = 1;
    scene.getAnimationRatio = () => animationRatio;
    const camera = new UniversalCamera('camera', new Vector3(25, 40, -90), scene);
    camera.setTarget(new Vector3(25, 9, -30));
    scene.activeCamera = camera;
    const source = MeshBuilder.CreateBox('source', { width: 2, height: 6, depth: 3 }, scene);
    source.material = scene.defaultMaterial;
    source.isVisible = false;
    const { CharacterView } = loadTypeScript('../src/game/rendering/characters/character-view.ts', {
        '../../runtime/game-runtime': { GameRuntime: { scene } },
        '../animation/assets-utils': { AssetUtils: { rotateMeshY() {} } },
    });
    let view;
    if (isPlayer) {
        const { PlayerView } = loadTypeScript('../src/game/rendering/characters/player-view.ts', {
            './character-view': { CharacterView },
            '../../runtime/game-runtime': { GameRuntime: { scene } },
            '../assets/assets': { AssetManager: { getWorldAsset: () => ({ mesh: source, scale: 1, sizeY: 6, animations: {} }) } },
            '../lighting/lighting': { LightingManager: { getInstance: () => ({ shadowGenerator: { addShadowCaster() {} } }) } },
        });
        view = new PlayerView({ x: 25, y: 0, z: -30 }, 250, { removeCharacter() {} });
    }
    else {
        view = new CharacterView(source.createInstance('enemy'), { removeCharacter() {} });
        view.mesh.position.set(25, 9, -30);
        view.mesh.scaling.set(2, 3, 4);
        view.mesh.rotation.y = Math.PI / 3;
    }
    t.after(() => {
        view.dispose();
        scene.dispose();
        engine.dispose();
    });
    const step = (ratio = 1) => {
        animationRatio = ratio;
        scene.onBeforeRenderObservable.notifyObservers(scene);
        for (const particles of [...scene.particleSystems]) {
            // NullEngine does not draw; advance particle simulation explicitly.
            particles.preWarmStepOffset = ratio;
            particles.animate(true);
        }
        scene.onAfterRenderObservable.notifyObservers(scene);
    };
    return { scene, camera, source, view, step };
}

test('damage surrounds the visible model bounds in a centered horizontal ring without changing an instanced material', t => {
    const { scene, source, view, camera, step } = createView(t);
    const accessory = MeshBuilder.CreateBox('accessory', { size: 2 }, scene);
    accessory.parent = view.mesh;
    accessory.position.set(2, 3, 1);
    const material = view.mesh.material;
    view.showDamage(100, 75, 100);
    const bounds = view.mesh.getHierarchyBoundingVectors();
    const [particles] = scene.particleSystems;
    assert.equal(scene.particleSystems.length, 1);
    assert.equal(particles.name, 'enemy-damage-burst');
    assert.equal(particles.getCapacity(), 18);
    assert.equal(view.mesh.sourceMesh, source);
    assert.equal(view.mesh.material, material);
    const center = bounds.min.add(bounds.max).scale(0.5);
    assert.ok(particles.emitter.equalsWithEpsilon(center), 'The emitter must use visible model bounds, including offset child meshes');
    const viewMatrix = camera.getViewMatrix();
    step();
    assert.equal(particles.getActiveCount(), 18);
    const initialPositions = particles.particles.map(particle => particle.position.clone());
    assert.ok(particles.particles.every(particle => particle.color.r === 1 && particle.color.a === 0.6));
    assert.ok(initialPositions.every(position => Math.abs(position.y - center.y) < 0.000001), 'Every fragment must start in the same plane parallel to the ground');
    const centroid = initialPositions.reduce((sum, position) => sum.addInPlace(position), Vector3.Zero()).scale(1 / initialPositions.length);
    assert.ok(centroid.equalsWithEpsilon(center), 'The complete ring must stay centered on the model, without a camera offset');
    const radius = Math.hypot(initialPositions[0].x - center.x, initialPositions[0].z - center.z);
    assert.ok(initialPositions.every(position => Math.abs(Math.hypot(position.x - center.x, position.z - center.z) - radius) < 0.000001), 'Fragments must be distributed evenly around a circle');
    const size = bounds.max.subtract(bounds.min);
    assert.ok(radius < Math.max(size.x, size.z) * 0.5, 'The ring must stay close to the body');
    const screenHeight = scene.getEngine().getRenderHeight() * scene.getEngine().getHardwareScalingLevel();
    assert.ok(particles.particles.every(particle => {
        const depth = Math.abs(Vector3.TransformCoordinates(center, viewMatrix).z);
        const projectedSize = particle.size * Math.abs(camera.getProjectionMatrix().m[5]) * screenHeight / (2 * depth);
        return Math.abs(projectedSize - 8) < 0.000001 && particle.scale.x === 1 && particle.scale.y === 1;
    }), 'Fragments must use an eight-pixel base size without random enlargement');
    camera.position.set(-80, 60, 20);
    camera.setTarget(center);
    step(0);
    assert.ok(particles.particles.every((particle, index) => particle.position.equals(initialPositions[index])), 'Camera movements must not rotate or offset the ring');
    step();
    assert.ok(particles.particles.some((particle, index) => Vector3.Distance(particle.position, initialPositions[index]) > 0));
    assert.ok(particles.particles.every(particle => Vector3.Dot(particle.direction, particle.position.subtract(particles.emitter)) > 0), 'Fragments must scatter outward around the character');
    assert.ok(particles.particles.every(particle => particle.direction.y === 0 && Math.abs(particle.position.y - center.y) < 0.000001), 'Expansion must remain parallel to the ground');
    assert.ok(particles.particles.every(particle => particle.color.a <= 0.6 && particle.color.a > 0), 'The halo must remain translucent');
    step(10);
    assert.ok(particles.particles.every(particle => particle.color.a < 0.5 && particle.color.a > 0), 'Fragments fade gradually after the initial flash');
    for (let frame = 0; frame < 12; frame++) {
        step();
    }
    assert.equal(scene.particleSystems.length, 0, 'The halo must disappear after about 350 ms');
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
});

test('the player gets a burst for each health loss without acquiring a floating health bar', t => {
    const { scene, view, step } = createView(t, true);
    view.showDamage(100, 100, 100);
    view.showDamage(75, 100, 100);
    assert.equal(scene.particleSystems.length, 0, 'Healing and unchanged health must not emit fragments');
    view.showDamage(100, 75, 100);
    view.showDamage(75, 50, 100);
    assert.equal(scene.particleSystems.length, 2, 'Rapid hits must each produce a burst');
    assert.ok(scene.particleSystems.every(particles => particles.name === 'player-damage-burst'));
    assert.equal(scene.getMeshByName('player-health-bar-background'), null);
    assert.equal(scene.textures.length, 1, 'All bursts in one scene share their fragment sprite');
    const texture = scene.textures[0];
    for (let frame = 0; frame < 24; frame++) {
        step();
    }
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
    view.showDamage(50, 40, 100);
    assert.equal(scene.particleSystems[0].particleTexture, texture, 'A later burst must reuse the surviving shared texture');
});

test('bursts freeze with particle simulation and are released immediately on character disposal', t => {
    const { scene, view, step } = createView(t);
    view.showDamage(100, 75, 100);
    step();
    const [particles] = scene.particleSystems;
    const initialPositions = particles.particles.map(particle => particle.position.clone());
    const initialAges = particles.particles.map(particle => particle.age);
    for (let frame = 0; frame < 120; frame++) {
        step(0);
    }
    assert.ok(particles.particles.every((particle, index) => particle.position.equals(initialPositions[index]) && particle.age === initialAges[index]));
    view.dispose();
    view.dispose();
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
    assert.equal(scene.onBeforeRenderObservable.hasObservers(), false);
    view.showDamage(75, 50, 100);
    assert.equal(scene.particleSystems.length, 0);
});

test('the damage halo follows a moving character without resetting its lifetime', t => {
    const { scene, view, step } = createView(t, true);
    view.showDamage(100, 75, 100);
    step();
    const [particles] = scene.particleSystems;
    const positions = particles.particles.map(particle => particle.position.clone());
    const origin = particles.emitter.clone();
    const ages = particles.particles.map(particle => particle.age);
    const displacement = new Vector3(24, -3, 15);
    view.mesh.position.addInPlace(displacement);
    step(0);
    assert.ok(particles.emitter.equalsWithEpsilon(origin.add(displacement)));
    assert.ok(particles.particles.every((particle, index) => particle.position.equalsWithEpsilon(positions[index].add(displacement)) && particle.age === ages[index]));
    for (let frame = 0; frame < 24; frame++) {
        step();
    }
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.onBeforeRenderObservable.hasObservers(), false);
});

test('normal scene rendering emits the damage halo once shaders are ready', async t => {
    const { scene, view } = createView(t, true);
    view.showDamage(100, 75, 100);
    const [particles] = scene.particleSystems;
    // NullEngine stores raw pixels but cannot upload them to a GPU.
    particles.particleTexture.getInternalTexture().isReady = true;
    for (let attempt = 0; attempt < 50 && !particles.isReady(); attempt++) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(particles.isReady(), true, 'The sprite and particle shaders must become ready');
    scene.render();
    assert.equal(particles.getActiveCount(), 18, 'A regular render must emit fragments without forced simulation');
    assert.equal(particles.manualEmitCount, 0);
    assert.ok(scene.getActiveParticles() > 0);
});

test('a lethal hit emits fragments alongside death, and the fragment texture belongs to its scene', t => {
    const { scene, view, step } = createView(t);
    view.showDamage(10, 0, 100);
    const burst = scene.particleSystems[0];
    const texture = burst.particleTexture;
    let textureDisposals = 0;
    texture.onDisposeObservable.add(() => textureDisposals++);
    view.showDeath();
    assert.equal(scene.particleSystems.length, 2);
    assert.ok(scene.particleSystems.includes(burst), 'Death must not cancel the final damage halo');
    view.showDamage(10, 0, 100);
    assert.equal(scene.particleSystems.length, 2, 'A dying character must not emit further fragments');
    step();
    assert.equal(burst.getActiveCount(), 18);
    view.dispose();
    assert.equal(scene.particleSystems.length, 0);
    assert.equal(scene.onAfterRenderObservable.hasObservers(), false);
    assert.equal(textureDisposals, 0, 'Disposing a character must not dispose a shared sprite');
    scene.dispose();
    assert.equal(textureDisposals, 1);
});
