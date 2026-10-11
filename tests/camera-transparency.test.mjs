import assert from 'node:assert/strict';
import test from 'node:test';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { MultiMaterial } from '@babylonjs/core/Materials/multiMaterial.js';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial.js';
import { Vector3, Quaternion } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import { loadTypeScript } from './load-typescript.mjs';

function createWorldView(t, materialCount = 1) {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    scene.useRightHandedSystem = true;
    scene.blockMaterialDirtyMechanism = true;
    const parts = Array.from({ length: materialCount }, (_, index) => {
        const part = MeshBuilder.CreateBox(`part-${index}`, { size: 20 }, scene);
        part.position.x = index * 25;
        part.material = new PBRMaterial(`material-${index}`, scene);
        part.material.transparencyMode = Material.MATERIAL_OPAQUE;
        part.material.freeze();
        return part;
    });
    const source = materialCount === 1 ? parts[0] : Mesh.MergeMeshes(parts, true, true, undefined, false, true);
    source.isVisible = false;
    const shadowCasters = new Set();
    const { WorldView } = loadTypeScript('../src/game/rendering/camera/world-view.ts', {
        '../../runtime/game-runtime': { GameRuntime: { scene } },
        '../lighting/lighting': {
            LightingManager: {
                getInstance: () => ({
                    shadowGenerator: {
                        addShadowCaster: mesh => shadowCasters.add(mesh),
                        removeShadowCaster: mesh => shadowCasters.delete(mesh),
                    },
                }),
            },
        },
    });
    const view = new WorldView({ mesh: { position: Vector3.Zero() } });
    view._camera = { position: new Vector3(0, 60, -60) };
    const createInstance = name => {
        const instance = source.createInstance(name);
        instance.position.set(0, 30, -30);
        instance.rotationQuaternion = null;
        instance.checkCollisions = true;
        instance.freezeWorldMatrix();
        return instance;
    };
    const step = () => view.setCameraObstacleSemiTransparent();
    t.after(() => {
        scene.dispose();
        engine.dispose();
    });
    return { scene, source, view, shadowCasters, createInstance, step };
}

for (const materialCount of [1, 2, 3, 5]) {
    test(`camera obstacles fade all ${materialCount} materials without changing other instances`, t => {
        const { scene, source, shadowCasters, createInstance, step } = createWorldView(t, materialCount);
        const obstacle = createInstance('obstacle');
        const neighbour = createInstance('neighbour');
        neighbour.unfreezeWorldMatrix();
        neighbour.position.x = 200;
        neighbour.freezeWorldMatrix();
        step();
        assert.equal(obstacle.isVisible, false);
        assert.equal(neighbour.isVisible, true);
        assert.equal(shadowCasters.size, 1);
        const [ghost] = shadowCasters;
        assert.equal(ghost.isEnabled(), true);
        assert.equal(ghost.isVisible, true);
        assert.equal(ghost.isPickable, false);
        assert.equal(ghost.checkCollisions, false);
        assert.equal(obstacle.checkCollisions, true);
        assert.ok(ghost.getWorldMatrix().equals(obstacle.getWorldMatrix()));
        const originals = source.material instanceof MultiMaterial ? source.material.subMaterials : [source.material];
        const transparent = ghost.material instanceof MultiMaterial ? ghost.material.subMaterials : [ghost.material];
        for (let index = 0; index < materialCount; index++) {
            assert.notEqual(transparent[index], originals[index]);
            assert.equal(originals[index].alpha, 1);
            assert.equal(originals[index].transparencyMode, Material.MATERIAL_OPAQUE);
            assert.equal(originals[index].isFrozen, true);
            assert.equal(transparent[index].alpha, 0.2);
            assert.equal(transparent[index].needAlphaBlendingForMesh(ghost), true);
        }
        const meshCount = scene.meshes.length;
        step();
        step();
        assert.equal(obstacle.isVisible, false, 'Hidden originals must remain detectable without picking their ghosts');
        assert.equal(scene.meshes.length, meshCount);
        assert.equal(shadowCasters.size, 1);
    });
}

test('transparent instances share materials and are reused after an obstacle disappears or unloads', t => {
    const { scene, source, shadowCasters, createInstance, step } = createWorldView(t, 5);
    const first = createInstance('first');
    const second = createInstance('second');
    step();
    const [firstGhost, secondGhost] = shadowCasters;
    assert.equal(shadowCasters.size, 2);
    assert.equal(firstGhost.sourceMesh, secondGhost.sourceMesh);
    assert.equal(firstGhost.material, secondGhost.material);
    const counts = [scene.meshes.length, scene.materials.length, scene.multiMaterials.length];
    for (let cycle = 0; cycle < 10; cycle++) {
        first.setEnabled(false);
        second.setEnabled(false);
        step();
        assert.equal(first.isVisible, true);
        assert.equal(second.isVisible, true);
        assert.equal(firstGhost.isEnabled(), false);
        assert.equal(secondGhost.isEnabled(), false);
        assert.equal(shadowCasters.size, 0);
        first.setEnabled(true);
        second.setEnabled(true);
        step();
        assert.ok(shadowCasters.has(firstGhost));
        assert.ok(shadowCasters.has(secondGhost));
        assert.deepEqual([scene.meshes.length, scene.materials.length, scene.multiMaterials.length], counts);
    }
    first.dispose();
    step();
    assert.equal(shadowCasters.size, 1);
    const replacement = createInstance('replacement');
    step();
    assert.equal(replacement.isVisible, false);
    assert.equal(shadowCasters.size, 2);
    assert.equal(firstGhost.sourceMesh, secondGhost.sourceMesh);
    assert.deepEqual([scene.meshes.length, scene.materials.length, scene.multiMaterials.length], counts);
    assert.equal(source.instances.length, 2);
    scene.dispose();
    assert.equal(firstGhost.isDisposed(), true);
    assert.equal(secondGhost.isDisposed(), true);
    assert.equal(scene.materials.length, 0);
    assert.equal(scene.multiMaterials.length, 0);
});

test('reused ghosts adopt the next obstacle transform and leave the previous instance intact', t => {
    const { view, createInstance } = createWorldView(t);
    const first = createInstance('first');
    view.setMeshTransparent(first);
    const ghost = view.ghostMeshes.get(first);
    view.resetMeshTransparency(first);
    const second = createInstance('second');
    second.parent = new Mesh('parent', second.getScene());
    second.position.set(7, 30, 9);
    second.scaling.set(2, 3, 4);
    second.rotationQuaternion = Quaternion.FromEulerAngles(0, 0.5, 0);
    view.setMeshTransparent(second);
    assert.equal(view.ghostMeshes.get(second), ghost);
    assert.equal(first.isVisible, true);
    assert.equal(second.isVisible, false);
    assert.equal(ghost.parent, second.parent);
    assert.ok(ghost.position.equals(second.position));
    assert.ok(ghost.scaling.equals(second.scaling));
    assert.ok(ghost.rotationQuaternion.equals(second.rotationQuaternion));
    assert.ok(first.position.equals(new Vector3(0, 30, -30)));
});
