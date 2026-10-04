import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import '@babylonjs/core/Materials/standardMaterial.js';
import { Camera } from '@babylonjs/core/Cameras/camera.js';
import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { loadTypeScript } from './load-typescript.mjs';

function createView(t, isRightHanded = true) {
    const engine = new NullEngine({ renderWidth: 800, renderHeight: 600 });
    const scene = new Scene(engine);
    scene.useRightHandedSystem = isRightHanded;
    const camera = new UniversalCamera('camera', new Vector3(0, 40, -60), scene);
    camera.setTarget(Vector3.Zero());
    scene.activeCamera = camera;
    const source = MeshBuilder.CreateBox('enemy-source', { width: 2, height: 6, depth: 3 }, scene);
    source.material = scene.defaultMaterial;
    source.isVisible = false;
    const mesh = source.createInstance('enemy');
    mesh.position.y = 9;
    mesh.scaling.set(2, 3, 4);
    mesh.rotation.y = Math.PI / 3;
    const sibling = source.createInstance('other-enemy');
    sibling.position.x = 30;
    const { CharacterView } = loadTypeScript('../src/game/rendering/characters/character-view.ts', {
        '../../runtime/game-runtime': { GameRuntime: { scene } },
        '../animation/assets-utils': { AssetUtils: { rotateMeshY() {} } },
    });
    const view = new CharacterView(mesh, { removeCharacter() {} });
    t.after(() => {
        view.dispose();
        scene.dispose();
        engine.dispose();
    });
    const step = seconds => {
        scene.getAnimationRatio = () => seconds * 60;
        scene.onBeforeRenderObservable.notifyObservers(scene);
    };
    const getPart = part => scene.getMeshByName(`enemy-health-bar-${part}`);
    return { engine, scene, camera, source, mesh, sibling, view, step, getPart };
}

function getProjectedWidth(mesh, camera, engine) {
    const transform = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    mesh.computeWorldMatrix(true);
    const halfWidth = mesh.getBoundingInfo().boundingBox.extendSize.x;
    const left = Vector3.TransformCoordinates(new Vector3(-halfWidth, 0, 0), mesh.getWorldMatrix());
    const right = Vector3.TransformCoordinates(new Vector3(halfWidth, 0, 0), mesh.getWorldMatrix());
    const projectedLeft = Vector3.Project(left, Matrix.Identity(), transform, viewport);
    const projectedRight = Vector3.Project(right, Matrix.Identity(), transform, viewport);
    assert.ok(projectedRight.x > projectedLeft.x, 'The bar must decrease from right to left on screen');
    assert.ok(Math.abs(projectedLeft.y - projectedRight.y) < 0.001, 'The bar must stay horizontal on screen');
    return Vector3.Distance(projectedLeft, projectedRight);
}

test('floating health bar follows model bounds and keeps its screen size across camera changes', t => {
    const { engine, camera, source, mesh, sibling, view, step, getPart } = createView(t);
    const accessory = MeshBuilder.CreateBox('accessory', { size: 2 }, mesh.getScene());
    accessory.parent = mesh;
    accessory.position.y = 5;
    assert.equal(getPart('background'), null, 'Undamaged enemies must not have a bar');
    view.showDamage(100, 60, 100);
    const background = getPart('background');
    const bounds = mesh.getHierarchyBoundingVectors();
    assert.ok(background.position.y > bounds.max.y, 'The bar must sit above every visible part of the model');
    assert.ok(Math.abs(getProjectedWidth(background, camera, engine) - 70) < 0.001);
    assert.equal(background.parent, null, 'Character scaling and rotation must not deform the bar');
    for (const part of [background, getPart('health'), getPart('damage')]) {
        assert.equal(part.isPickable, false);
        assert.equal(part.checkCollisions, false);
        assert.equal(part.material.disableLighting, true);
    }
    assert.equal(mesh.sourceMesh, source);
    assert.equal(sibling.sourceMesh, source);
    assert.equal(mesh.material, sibling.material, 'Health bars must not alter shared character materials');
    assert.equal(mesh.getScene().getMeshByName('other-enemy-health-bar-background'), null);

    const oldPosition = background.position.clone();
    mesh.position.x += 10;
    step(0);
    assert.ok(Math.abs(background.position.x - oldPosition.x - 10) < 0.001);
    camera.position.scaleInPlace(2);
    step(0);
    assert.ok(Math.abs(getProjectedWidth(background, camera, engine) - 70) < 0.001);

    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    camera.orthoLeft = -100;
    camera.orthoRight = 100;
    camera.orthoTop = 75;
    camera.orthoBottom = -75;
    step(0);
    assert.ok(Math.abs(getProjectedWidth(background, camera, engine) - 70) < 0.001);
});

test('bar layers keep distinct depths while enemies and the camera move', t => {
    for (const isRightHanded of [true, false]) {
        const { scene, mesh, camera, view, step, getPart } = createView(t, isRightHanded);
        view.showDamage(100, 60, 100);
        step(0.5);
        for (let frame = 0; frame < 120; frame++) {
            mesh.position.set(5000 + frame * 0.3, 9, 5000 + Math.sin(frame * 0.1) * 20);
            camera.position.set(5000 + frame * 0.15, 250, 4830);
            camera.setTarget(new Vector3(5000 + frame * 0.15, 0, 5000));
            scene.incrementRenderId();
            step(0);
            const viewMatrix = camera.getViewMatrix();
            const getDepth = part => {
                const mesh = getPart(part);
                mesh.computeWorldMatrix(true);
                return Math.abs(Vector3.TransformCoordinates(mesh.getAbsolutePosition(), viewMatrix).z);
            };
            const backgroundDepth = getDepth('background');
            const damageDepth = getDepth('damage');
            const healthDepth = getDepth('health');
            assert.ok(backgroundDepth - damageDepth > 0.01, 'The damage trail must be physically closer than the background');
            assert.ok(damageDepth - healthDepth > 0.01, 'Health must be physically closer than the damage trail');
        }
    }
});

test('health decreases smoothly while a delayed trail shows the previous value, then expires after ten seconds', t => {
    const { scene, view, step, getPart } = createView(t);
    const meshCount = scene.meshes.length;
    const materialCount = scene.materials.length;
    view.showDamage(100, 60, 100);
    const health = getPart('health');
    const damage = getPart('damage');
    const healthMaterial = health.material;
    assert.equal(health.scaling.x, 1);
    assert.equal(damage.scaling.x, 1);
    step(0.08);
    assert.ok(health.scaling.x > 0.6 && health.scaling.x < 1);
    assert.equal(damage.scaling.x, 1, 'Previous health must remain readable before the trail starts shrinking');
    const previousDamageRatio = damage.scaling.x;
    step(0.12);
    assert.equal(health.scaling.x, 0.6);
    assert.ok(damage.scaling.x > health.scaling.x && damage.scaling.x < previousDamageRatio);
    // Both fills shrink from the right, preserving the same left edge.
    const halfFillWidth = health.getBoundingInfo().boundingBox.extendSize.x;
    assert.ok(Math.abs(health.position.x - health.scaling.x * halfFillWidth + halfFillWidth) < 1e-8);
    assert.ok(Math.abs(damage.position.x - damage.scaling.x * halfFillWidth + halfFillWidth) < 1e-8);
    step(0.28);
    assert.equal(damage.scaling.x, 0.6);
    step(9.519);
    assert.ok(getPart('background'));
    step(0.002);
    assert.equal(getPart('background'), null);
    assert.equal(scene.meshes.length, meshCount);
    assert.equal(scene.materials.length, materialCount + 3, 'Shared materials remain available until scene disposal');
    assert.equal(scene.onBeforeRenderObservable.hasObservers(), false);
    view.showDamage(60, 50, 100);
    assert.equal(getPart('health').scaling.x, 0.6, 'A later hit starts from current health, not full health');
    assert.equal(getPart('health').material, healthMaterial, 'A recreated bar must reuse the shared material');
    assert.equal(scene.materials.length, materialCount + 3);
});

test('successive hits reuse the bar, continue its animation and restart its visibility using render time', t => {
    const { scene, view, step, getPart } = createView(t);
    view.showDamage(100, 60, 100);
    const background = getPart('background');
    step(0.25);
    const damageRatio = getPart('damage').scaling.x;
    const observerCount = scene.onBeforeRenderObservable.observers.length;
    view.showDamage(60, 40, 100);
    assert.equal(getPart('background'), background);
    assert.equal(getPart('health').scaling.x, 0.6);
    assert.equal(getPart('damage').scaling.x, damageRatio, 'Another hit must not jump the trail back to full health');
    assert.equal(scene.onBeforeRenderObservable.observers.length, observerCount);
    for (let frame = 0; frame < 120; frame++) {
        step(0);
    }
    assert.equal(getPart('damage').scaling.x, damageRatio, 'Without render time, pauses must not advance the animation');
    step(9.8);
    assert.equal(getPart('background'), background, 'Visibility must restart from the most recent hit');
    assert.equal(getPart('health').scaling.x, 0.4);
    step(0.201);
    assert.equal(getPart('background'), null);
});

test('character death and disposal release health bar meshes and observers while preserving shared materials', t => {
    for (const shouldDie of [false, true]) {
        const { scene, view, mesh, step, getPart } = createView(t);
        const materialCount = scene.materials.length;
        view.showDamage(100, 75, 100);
        if (shouldDie) {
            view.showDeath();
        }
        else {
            view.dispose();
            view.dispose();
        }
        assert.equal(getPart('background'), null);
        assert.equal(getPart('health'), null);
        assert.equal(getPart('damage'), null);
        assert.equal(scene.materials.length, materialCount + 3);
        assert.equal(scene.onBeforeRenderObservable.hasObservers(), false);
        view.showDamage(75, 50, 100);
        step(0.1);
        assert.equal(getPart('background'), null, 'Dead or disposed characters must not recreate a bar');
        assert.equal(mesh.isDisposed(), !shouldDie);
    }
});

test('bars share materials within a scene and release them only with their owning scene', t => {
    const { scene, sibling, view, getPart } = createView(t);
    const otherView = new view.constructor(sibling, { removeCharacter() {} });
    const otherScene = new Scene(scene.getEngine());
    const otherMesh = MeshBuilder.CreateBox('other-scene-enemy', {}, otherScene);
    const otherSceneView = new view.constructor(otherMesh, { removeCharacter() {} });
    t.after(() => {
        otherView.dispose();
        otherSceneView.dispose();
        otherScene.dispose();
    });
    view.showDamage(100, 60, 100);
    const materialCount = scene.materials.length;
    otherView.showDamage(100, 80, 100);
    otherSceneView.showDamage(100, 90, 100);
    let disposedMaterialCount = 0;
    for (const part of ['background', 'damage', 'health']) {
        const material = getPart(part).material;
        const otherBar = scene.getMeshByName(`other-enemy-health-bar-${part}`);
        const otherSceneBar = otherScene.getMeshByName(`other-scene-enemy-health-bar-${part}`);
        assert.equal(otherBar.material, material);
        assert.notEqual(otherSceneBar.material, material, 'Different scenes must own distinct materials');
        assert.equal(otherSceneBar.material.getScene(), otherScene);
        material.onDisposeObservable.add(() => disposedMaterialCount++);
    }
    assert.equal(scene.materials.length, materialCount);
    view.dispose();
    assert.equal(disposedMaterialCount, 0, 'Disposing one bar must preserve the materials used by another');
    otherView.dispose();
    assert.equal(disposedMaterialCount, 0, 'Materials must survive the last bar for later reuse');
    otherScene.dispose();
    assert.equal(disposedMaterialCount, 0, 'Disposing another scene must not affect shared materials');
    scene.dispose();
    assert.equal(disposedMaterialCount, 3);
});
