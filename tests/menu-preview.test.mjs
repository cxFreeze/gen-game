import assert from 'node:assert/strict';
import test from 'node:test';
import { signal } from '@angular/core';
import { Animation } from '@babylonjs/core/Animations/animation.js';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import '@babylonjs/core/Animations/animatable.js';
import { Bone } from '@babylonjs/core/Bones/bone.js';
import { Skeleton } from '@babylonjs/core/Bones/skeleton.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine.js';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { AssetContainer } from '@babylonjs/core/assetContainer.js';
import { Scene } from '@babylonjs/core/scene.js';
import { loadTypeScript } from './load-typescript.mjs';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

test('preview switches from Idle to Running in the same scene and fits narrow canvases', async () => {
    const engine = new NullEngine({ renderWidth: 600, renderHeight: 400 });
    const scene = new Scene(engine);
    try {
        const container = new AssetContainer(scene);
        const root = new TransformNode('duck-root', scene);
        const mesh = MeshBuilder.CreateBox('duck', { width: 1, height: 2, depth: 0.75 }, scene);
        mesh.parent = root;
        container.rootNodes.push(root);
        container.transformNodes.push(root);
        container.meshes.push(mesh);
        for (const name of ['Idle', 'Running']) {
            const animation = new Animation(name, name === 'Running' ? 'position.y' : 'rotation.y', 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
            animation.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: name === 'Running' ? 2 : 0.1 }]);
            const group = new AnimationGroup(name, scene);
            group.addTargetedAnimation(animation, root);
            container.animationGroups.push(group);
        }
        container.removeAllFromScene();
        const { MenuView } = loadTypeScript('../src/game/rendering/menu/menu-view.ts', {
            '@babylonjs/core/Loading/sceneLoader.js': {
                LoadAssetContainerAsync: async (path, targetScene) => {
                    assert.equal(path, './3d/player.glb');
                    assert.equal(targetScene, scene);
                    return container;
                },
            },
        });
        const view = new MenuView(scene);
        await view.load(new AbortController().signal);
        assert.equal(mesh.parent, root);
        assert.equal(root.parent.name, 'menu-player');
        assert.equal(container.animationGroups[0].isStarted, true);
        const initialTarget = scene.activeCamera.target.clone();
        const initialRadius = scene.activeCamera.radius;
        assert.ok(initialTarget.y > 0.5, 'Camera must include the higher Running pose before switching');
        view.setAnimation('Running');
        assert.equal(Boolean(container.animationGroups[0].isStarted), false);
        assert.equal(container.animationGroups[1].isStarted, true);
        assert.equal(container.animationGroups[1].loopAnimation, true);
        assert.equal(container.animationGroups[1].isAdditive, false);
        assert.ok(scene.activeCamera.target.equals(initialTarget));
        assert.equal(scene.activeCamera.radius, initialRadius);
        for (const animation of container.animationGroups) {
            assert.equal(animation.enableBlending, true);
            assert.equal(animation.blendingSpeed, 0.06);
        }
        assert.equal(root.parent.name, 'menu-player');
        assert.equal(scene.meshes.includes(mesh), true);
        assert.equal(scene.clearColor.a, 0);
        engine.getAspectRatio = () => 0.5;
        view.resize();
        assert.ok(scene.activeCamera.radius > initialRadius);
        view.dispose();
        view.dispose();
        assert.equal(mesh.isDisposed(), true);
    }
    finally {
        scene.dispose();
        engine.dispose();
    }
});

test('menu framing keeps the skinned head inside the canvas throughout Idle and after resizing', async () => {
    const engine = new NullEngine({ renderWidth: 600, renderHeight: 800 });
    const scene = new Scene(engine);
    try {
        scene.useRightHandedSystem = true;
        const container = new AssetContainer(scene);
        const mesh = MeshBuilder.CreateBox('animated-duck', { width: 1, height: 2, depth: 0.75 }, scene);
        const skeleton = new Skeleton('duck-rig', 'duck-rig', scene);
        const bone = new Bone('duck-bone', skeleton, null, Matrix.Identity());
        mesh.skeleton = skeleton;
        const vertexCount = mesh.getTotalVertices();
        const weights = new Float32Array(vertexCount * 4);
        for (let vertex = 0; vertex < vertexCount; vertex++) {
            weights[vertex * 4] = 1;
        }
        mesh.setVerticesData(VertexBuffer.MatricesIndicesKind, new Float32Array(vertexCount * 4));
        mesh.setVerticesData(VertexBuffer.MatricesWeightsKind, weights);
        const animation = new Animation('head-motion', 'position', 30, Animation.ANIMATIONTYPE_VECTOR3, Animation.ANIMATIONLOOPMODE_CYCLE);
        animation.setKeys([
            { frame: 0, value: new Vector3(0, 2, 0) },
            { frame: 15, value: new Vector3(0, 3, 0) },
            { frame: 30, value: new Vector3(0, 2, 0) },
        ]);
        const idle = new AnimationGroup('Idle', scene);
        idle.addTargetedAnimation(animation, bone);
        container.rootNodes.push(mesh);
        container.meshes.push(mesh);
        container.skeletons.push(skeleton);
        container.animationGroups.push(idle);
        container.removeAllFromScene();
        const { MenuView } = loadTypeScript('../src/game/rendering/menu/menu-view.ts', {
            '@babylonjs/core/Loading/sceneLoader.js': { LoadAssetContainerAsync: async () => container },
        });
        const view = new MenuView(scene);
        await view.load(new AbortController().signal);
        assert.ok(scene.activeCamera.target.y > 2, 'Camera must target the animated model, not the unposed origin');
        for (const aspectRatio of [1.5, 0.5]) {
            engine.getAspectRatio = () => aspectRatio;
            view.resize();
            for (const frame of [0, 7.5, 15, 22.5, 30]) {
                idle.goToFrame(frame);
                skeleton.prepare(true);
                mesh.refreshBoundingInfo({ applySkeleton: true });
                mesh.computeWorldMatrix(true);
                const transform = scene.activeCamera.getViewMatrix().multiply(scene.activeCamera.getProjectionMatrix(true));
                for (const corner of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
                    const projected = Vector3.TransformCoordinates(corner, transform);
                    assert.ok(Math.abs(projected.x) < 0.95, `Horizontal clipping at frame ${frame}: ${projected.x}`);
                    assert.ok(Math.abs(projected.y) < 0.95, `Head or feet clipped at frame ${frame}: ${projected.y}`);
                }
            }
        }
        view.dispose();
    }
    finally {
        scene.dispose();
        engine.dispose();
    }
});

test('leaving the menu while the model loads discards the late asset container', async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
        const pending = deferred();
        let disposals = 0;
        let presentations = 0;
        const { MenuView } = loadTypeScript('../src/game/rendering/menu/menu-view.ts', {
            '@babylonjs/core/Loading/sceneLoader.js': { LoadAssetContainerAsync: () => pending.promise },
        });
        const view = new MenuView(scene);
        const controller = new AbortController();
        const loading = view.load(controller.signal);
        const cancelled = assert.rejects(loading, { name: 'AbortError' });
        controller.abort();
        view.dispose();
        pending.resolve({
            dispose: () => disposals++,
            addAllToScene: () => presentations++,
        });
        await cancelled;
        assert.equal(disposals, 1);
        assert.equal(presentations, 0);
    }
    finally {
        scene.dispose();
        engine.dispose();
    }
});

function createMenuRuntime(load = () => Promise.resolve()) {
    const calls = { engineDisposals: 0, sceneDisposals: 0, viewDisposals: 0, starts: 0, stops: 0, resizes: 0, viewResizes: 0, disconnects: 0, renders: 0, animations: [] };
    let observedCanvas;
    let render;
    let resize;
    let signal;
    const { MenuRuntime } = loadTypeScript('../src/game/runtime/menu-runtime.ts', {
        '@babylonjs/core/Engines/engine.js': { Engine: class {
            resize() {
 calls.resizes++; 
}
            runRenderLoop(callback) {
 calls.starts++; render = callback; 
}
            stopRenderLoop() {
 calls.stops++; 
}
            dispose() {
 calls.engineDisposals++; 
}
        } },
        '@babylonjs/core/scene.js': { Scene: class {
            render() {
 calls.renders++; 
}
            dispose() {
 calls.sceneDisposals++; 
}
        } },
        '../rendering/menu/menu-view': { MenuView: class {
            load(lifetimeSignal) {
 signal = lifetimeSignal; return load(); 
}
            setAnimation(animation) {
 calls.animations.push(animation);
}
            resize() {
 calls.viewResizes++; 
}
            dispose() {
 calls.viewDisposals++; 
}
        } },
        '../rendering/scene/babylon-configuration': { configureBabylon() {} },
    }, {
        ResizeObserver: class {
            constructor(callback) {
 resize = callback; 
}
            observe(canvas) {
 observedCanvas = canvas; 
}
            disconnect() {
 calls.disconnects++; 
}
        },
    });
    const canvas = {};
    const runtime = new MenuRuntime(canvas);
    return { runtime, calls, canvas, get observedCanvas() {
 return observedCanvas; 
}, get signal() {
 return signal; 
}, render: () => render(), resize: () => resize() };
}

test('menu runtime renders and resizes its preview, then releases every resource once', async () => {
    const menu = createMenuRuntime();
    await menu.runtime.start();
    menu.runtime.setAnimation('Running');
    assert.equal(menu.observedCanvas, menu.canvas);
    assert.equal(menu.calls.starts, 1);
    assert.deepEqual(menu.calls.animations, ['Running']);
    menu.render();
    menu.resize();
    assert.equal(menu.calls.renders, 1);
    assert.equal(menu.calls.resizes, 2);
    assert.equal(menu.calls.viewResizes, 2);
    menu.runtime.dispose();
    menu.runtime.dispose();
    menu.render();
    menu.resize();
    assert.equal(menu.calls.renders, 1);
    assert.equal(menu.calls.resizes, 2);
    assert.equal(menu.signal.aborted, true);
    for (const key of ['engineDisposals', 'sceneDisposals', 'viewDisposals', 'disconnects', 'stops']) {
        assert.equal(menu.calls[key], 1);
    }
});

test('menu runtime never starts a render loop after cancellation during model loading', async () => {
    const pending = deferred();
    const menu = createMenuRuntime(() => pending.promise);
    const startup = menu.runtime.start();
    const cancelled = assert.rejects(startup, { name: 'AbortError' });
    menu.runtime.dispose();
    pending.resolve();
    await cancelled;
    assert.equal(menu.calls.starts, 0);
    assert.equal(menu.calls.engineDisposals, 1);
    assert.equal(menu.calls.sceneDisposals, 1);
});

test('animation changes during asset loading are applied without restarting the preview', async () => {
    const pending = deferred();
    const menu = createMenuRuntime(() => pending.promise);
    const startup = menu.runtime.start();
    menu.runtime.setAnimation('Running');
    pending.resolve();
    await startup;
    assert.deepEqual(menu.calls.animations, ['Running', 'Running']);
    assert.equal(menu.calls.starts, 1);
    menu.runtime.dispose();
});

test('menu runtime cleans up a failed preview load', async () => {
    const menu = createMenuRuntime(() => Promise.reject(new Error('Model unavailable')));
    await assert.rejects(menu.runtime.start(), /Model unavailable/);
    assert.equal(menu.calls.starts, 0);
    assert.equal(menu.calls.viewDisposals, 1);
    assert.equal(menu.calls.sceneDisposals, 1);
    assert.equal(menu.calls.engineDisposals, 1);
});

test('Angular keeps the same preview while changing animation and starting the game', async () => {
    const calls = [];
    const previews = [];
    const { GameRuntimeService } = loadTypeScript('../src/app/core/game-runtime/game-runtime.service.ts', {
        '@angular/core': { Service: () => target => target, signal },
        '../../../game/runtime/game-runtime': { GameRuntime: { start: async () => calls.push('game') } },
        '../../../game/runtime/menu-runtime': { MenuRuntime: class {
            constructor() { previews.push(this); }
            async start() { calls.push('preview'); }
            setAnimation(animation) { calls.push(animation); }
            dispose() { calls.push('preview-disposed'); }
        } },
        '../../../game/runtime/game-seed': { GameSeed: class {} },
    });
    const runtime = new GameRuntimeService();
    const canvas = {};
    await runtime.startMenuPreview(canvas);
    assert.deepEqual(calls, ['preview']);
    runtime.setMenuPreviewAnimation(canvas, 'Running');
    await runtime.start({});
    assert.equal(previews.length, 1);
    assert.deepEqual(calls, ['preview', 'Running', 'game']);
    runtime.stopMenuPreview(canvas);
    assert.deepEqual(calls, ['preview', 'Running', 'game', 'preview-disposed']);
});

test('a late failure from an old menu preview cannot stop its replacement', async () => {
    const pending = deferred();
    const previews = [];
    const { GameRuntimeService } = loadTypeScript('../src/app/core/game-runtime/game-runtime.service.ts', {
        '@angular/core': { Service: () => target => target, signal },
        '../../../game/runtime/game-runtime': { GameRuntime: {} },
        '../../../game/runtime/menu-runtime': { MenuRuntime: class {
            constructor() {
 previews.push(this); 
}
            start() {
 return previews.length === 1 ? pending.promise : Promise.resolve(); 
}
            dispose() {
 this.isDisposed = true; 
}
        } },
        '../../../game/runtime/game-seed': { GameSeed: class {} },
    });
    const runtime = new GameRuntimeService();
    const canvas = {};
    const oldStartup = runtime.startMenuPreview(canvas);
    const failed = assert.rejects(oldStartup, /Old request failed/);
    await runtime.startMenuPreview(canvas);
    pending.reject(new Error('Old request failed'));
    await failed;
    assert.equal(previews[0].isDisposed, true);
    assert.equal(previews[1].isDisposed, undefined);
    runtime.stopMenuPreview();
    assert.equal(previews[1].isDisposed, true);
});
