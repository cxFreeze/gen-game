import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import test from 'node:test';
import { firstValueFrom } from 'rxjs';
import { signal } from '@angular/core';
import { GameLifetime } from '../src/game/runtime/game-lifetime.ts';
import { loadTypeScript } from './load-typescript.mjs';

test('disposal cancels deferred work and delayed loading notifications', async () => {
    const session = new GameLifetime();
    let callbackCount = 0;
    let loadingCount = 0;
    const loading = session.loaded$.subscribe(() => loadingCount++);
    session.schedule(() => callbackCount++, 10);
    session.finishLoading();
    session.dispose();
    session.dispose();
    session.schedule(() => callbackCount++, 0);
    await wait(30);
    assert.equal(session.signal.aborted, true);
    assert.equal(session.isReady, false);
    assert.equal(loading.closed, true);
    assert.equal(callbackCount, 0);
    assert.equal(loadingCount, 0);
});

test('a new session receives its own loading notification after the previous one completed', async () => {
    const first = new GameLifetime();
    const firstLoaded = firstValueFrom(first.loaded$);
    first.finishLoading();
    await firstLoaded;
    first.dispose();
    const second = new GameLifetime();
    const secondLoaded = firstValueFrom(second.loaded$);
    second.finishLoading();
    await secondLoaded;
    assert.equal(second.isReady, true);
    second.dispose();
});

function createRuntime(loadAssets) {
    const engines = [];
    const scenes = [];
    const playerViews = [];
    const worldViews = [];
    const cleanups = new Map();
    const counts = { players: 0, inputs: 0 };
    const manager = name => ({
        getInstance: () => ({
            createLightning() {},
            createPlayer() {
 counts.players++; 
},
            generateWorld() {},
        }),
        dispose: () => cleanups.set(name, (cleanups.get(name) ?? 0) + 1),
    });
    class Engine {
        constructor() {
 engines.push(this); 
}
        stopRenderLoop() {
 this.isRunning = false; 
}
        runRenderLoop() {
 this.isRunning = true; 
}
        getFps() {
 return 60; 
}
        dispose() {
 this.isDisposed = true; 
}
    }
    class Scene {
        constructor() {
 scenes.push(this); 
}
        dispose() {
 this.isDisposed = true; 
}
    }
    const { GameRuntime } = loadTypeScript('../src/game/runtime/game-runtime.ts', {
        '@babylonjs/core/Engines/engine.js': { Engine },
        '@babylonjs/core/scene.js': { Scene, ScenePerformancePriority: { Intermediate: 1 } },
        '../gameplay/game': { Game: class {
            constructor() {
                counts.players++;
            }
            update() {}
            dispose() {
                cleanups.set('game', (cleanups.get('game') ?? 0) + 1);
            }
        } },
        '../rendering/game-presentation': { GamePresentation: class {
            bodies = {};
            physics = {};
            world = {};
            playerView = {};
            constructor() {
                playerViews.push(this.playerView);
            }
            dispose() {}
        } },
        '../input/player-inputs': { PlayerInputs: { ...manager('inputs'), init() {
 counts.inputs++; 
} } },
        '../rendering/assets/assets': { AssetManager: { ...manager('assets'), loadAssets } },
        '../rendering/lighting/lighting': { LightingManager: manager('lighting') },
        '../rendering/camera/world-view': { WorldView: class {
            constructor(player) {
                this.player = player;
                worldViews.push(this);
            }
            generateWorld() {}
        } },
        '../rendering/world/world-renderer': { WorldRenderer: manager('generator') },
        './debug': { DebugManager: class {
            constructor(player, worldView) {
                this.player = player;
                this.worldView = worldView;
            }
        } },
        '../rendering/scene/babylon-configuration': { configureBabylon() {} },
        './game-lifetime': { GameLifetime },
        '../rendering/scene/performance': { Performance: { ...manager('performance'), setPerformance() {} } },
    }, { window: new EventTarget() });
    return { GameRuntime, engines, scenes, counts, cleanups, playerViews, worldViews };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

test('stopping during asset loading prevents player creation and render-loop startup', async () => {
    const assets = deferred();
    const runtime = createRuntime(() => assets.promise);
    const startup = runtime.GameRuntime.start({}, () => {});
    const stopped = assert.rejects(startup, { name: 'AbortError' });
    runtime.GameRuntime.dispose();
    assets.resolve();
    await stopped;
    assert.equal(runtime.counts.players, 0);
    assert.equal(runtime.counts.inputs, 0);
    assert.equal(runtime.engines[0].isRunning, false);
    assert.equal(runtime.engines[0].isDisposed, true);
    assert.equal(runtime.scenes[0].isDisposed, true);
});

test('a late failure from an old startup cannot dispose the replacement session', async () => {
    const oldAssets = deferred();
    let loadCount = 0;
    const runtime = createRuntime(() => ++loadCount === 1 ? oldAssets.promise : Promise.resolve());
    const firstStartup = runtime.GameRuntime.start({}, () => {});
    const firstFailed = assert.rejects(firstStartup, /old request failed/);
    await runtime.GameRuntime.start({}, () => {});
    const debug = runtime.GameRuntime.debug;
    assert.equal(debug.player, runtime.playerViews[0]);
    assert.equal(debug.worldView, runtime.worldViews[0]);
    assert.equal(debug.worldView.player, debug.player);
    oldAssets.reject(new Error('old request failed'));
    await firstFailed;
    assert.equal(runtime.engines[0].isDisposed, true);
    assert.equal(runtime.engines[1].isDisposed, undefined);
    assert.equal(runtime.engines[1].isRunning, true);
    assert.equal(runtime.counts.players, 1);
    assert.equal(runtime.GameRuntime.debug, debug);
    runtime.GameRuntime.dispose();
    assert.throws(() => runtime.GameRuntime.debug, /not initialized/);
});

test('a failed startup releases the scene, engine and every manager', async () => {
    const runtime = createRuntime(() => Promise.reject(new Error('asset failed')));
    await assert.rejects(runtime.GameRuntime.start({}, () => {}), /asset failed/);
    assert.equal(runtime.engines[0].isDisposed, true);
    assert.equal(runtime.scenes[0].isDisposed, true);
    assert.equal(runtime.GameRuntime.isReady, false);
    for (const cleanupCount of runtime.cleanups.values()) {
        assert.equal(cleanupCount, 2);
    }
});

function createSessionService(GameRuntime) {
    const destroyRef = {};
    const uiStoreToken = {};
    const errors = [];
    const destroyCallbacks = [];
    const { GameRuntimeService } = loadTypeScript('../src/app/core/game-runtime/game-runtime.service.ts', {
        '@angular/core': { Service: () => target => target, signal },
        '../../../game/runtime/game-runtime': { GameRuntime },
        '../../../game/runtime/game-seed': { GameSeed: class { value = 'test'; } },
    });
    const ui = {
        initialize() {
 this.error = undefined; 
},
        updateStats() {},
        finishLoading() {},
        failLoading(error) {
 this.error = error; 
},
    };
    const instances = new Map([
        [GameRuntimeService, new GameRuntimeService()],
        [destroyRef, { onDestroy: callback => destroyCallbacks.push(callback) }],
        [uiStoreToken, ui],
    ]);
    const { GameSessionService } = loadTypeScript('../src/app/features/gameplay/game-session.service.ts', {
        '@angular/core': {
            Service: () => target => target,
            inject: token => instances.get(token),
            DestroyRef: destroyRef,
        },
        '../../core/game-runtime/game-runtime.service': { GameRuntimeService },
        './game-ui.service': { GameUiService: uiStoreToken },
    }, { console: { error: error => errors.push(error) } });
    return { service: new GameSessionService(), ui, errors, destroyCallbacks };
}

test('the Angular service ignores old startup errors and disposes the current session on destruction', async () => {
    const oldAssets = deferred();
    let loadCount = 0;
    const runtime = createRuntime(() => ++loadCount === 1 ? oldAssets.promise : Promise.resolve());
    const { service, ui, errors, destroyCallbacks } = createSessionService(runtime.GameRuntime);
    const firstStartup = service.start({});
    await service.start({});
    oldAssets.reject(new Error('obsolete failure'));
    await firstStartup;
    assert.equal(ui.error, undefined);
    assert.equal(errors.length, 0);
    assert.equal(runtime.engines[1].isRunning, true);
    destroyCallbacks.forEach(callback => callback());
    assert.equal(runtime.engines[1].isDisposed, true);
});

test('the Angular service reports a current startup failure after releasing its resources', async () => {
    const error = new Error('current failure');
    const runtime = createRuntime(() => Promise.reject(error));
    const { service, ui, errors } = createSessionService(runtime.GameRuntime);
    await service.start({});
    assert.equal(ui.error, error);
    assert.deepEqual(errors, [error]);
    assert.equal(runtime.engines[0].isDisposed, true);
    service.dispose();
});
