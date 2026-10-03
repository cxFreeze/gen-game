import assert from 'node:assert/strict';
import { setTimeout as wait } from 'node:timers/promises';
import test from 'node:test';
import { firstValueFrom } from 'rxjs';
import { Injector, runInInjectionContext, signal } from '@angular/core';
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
    const observables = loadTypeScript('../src/game/runtime/game-observables.ts');
    const engines = [];
    const scenes = [];
    const playerViews = [];
    const worldViews = [];
    const cleanups = new Map();
    const counts = { players: 0, inputs: 0 };
    const players = [];
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
        frameId = 0;
        constructor() {
 engines.push(this); 
}
        stopRenderLoop() {
 this.isRunning = false; 
}
        runRenderLoop(render) {
 this.render = render;
 this.isRunning = true; 
}
        getFps() {
 return 60; 
}
        getDeltaTime() {
            return 16;
        }
        dispose() {
 this.isDisposed = true; 
}
    }
    class Scene {
        meshes = [{}, {}, {}];
        constructor() {
 scenes.push(this); 
}
        dispose() {
 this.isDisposed = true; 
}
        render() {}
        getTotalVertices() {
            return 30;
        }
    }
    const { GameRuntime } = loadTypeScript('../src/game/runtime/game-runtime.ts', {
        '@babylonjs/core/Engines/engine.js': { Engine },
        '@babylonjs/core/scene.js': { Scene, ScenePerformancePriority: { Intermediate: 1 } },
        '../gameplay/game': { Game: class {
            player = { health: 100, maxHealth: 100 };
            constructor() {
                counts.players++;
                players.push(this.player);
            }
            update() {}
            dispose() {
                cleanups.set('game', (cleanups.get('game') ?? 0) + 1);
            }
        } },
        '../rendering/game-presentation': { GamePresentation: class {
            playerView = {};
            constructor() {
                playerViews.push(this.playerView);
            }
            dispose() {}
        } },
        '../input/player-inputs': { PlayerInputs: { ...manager('inputs'), checkInputs() {}, getCommands() {
            return {};
        }, init() {
 counts.inputs++; 
} } },
        '../rendering/assets/assets': { AssetManager: { ...manager('assets'), loadAssets } },
        '../rendering/lighting/lighting': { LightingManager: manager('lighting') },
        '../rendering/camera/world-view': { WorldView: class {
            worldX = 10;
            worldY = -6;
            constructor(player) {
                this.player = player;
                worldViews.push(this);
            }
            generateWorld() {}
            present() {}
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
        './game-observables': observables,
        '../rendering/scene/performance': { Performance: { ...manager('performance'), setPerformance() {} } },
    }, { window: new EventTarget() });
    return { GameRuntime, engines, scenes, counts, cleanups, players, playerViews, worldViews, ...observables };
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
    const startup = runtime.GameRuntime.start({});
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
    const firstStartup = runtime.GameRuntime.start({});
    const firstFailed = assert.rejects(firstStartup, /old request failed/);
    await runtime.GameRuntime.start({});
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
    await assert.rejects(runtime.GameRuntime.start({}), /asset failed/);
    assert.equal(runtime.engines[0].isDisposed, true);
    assert.equal(runtime.scenes[0].isDisposed, true);
    assert.equal(runtime.GameRuntime.isReady, false);
    for (const cleanupCount of runtime.cleanups.values()) {
        assert.equal(cleanupCount, 2);
    }
});

test('runtime publishes debug statistics every ten frames and ignores stopped render loops', async t => {
    const runtime = createRuntime(() => Promise.resolve());
    const updates = [];
    const subscription = runtime.debugStats$.subscribe(stats => updates.push(stats));
    t.after(() => {
        subscription.unsubscribe();
        runtime.GameRuntime.dispose();
    });
    await runtime.GameRuntime.start({});
    assert.equal(updates.at(-1).fps, 0);
    updates.length = 0;
    const firstEngine = runtime.engines[0];
    firstEngine.frameId = 9;
    firstEngine.render();
    assert.equal(updates.length, 0);
    firstEngine.frameId = 10;
    firstEngine.render();
    assert.deepEqual({ ...updates[0] }, { fps: 60, worldX: 10, worldY: -6, meshCount: 3, polygonCount: 10 });
    await runtime.GameRuntime.start({});
    assert.equal(updates.at(-1).fps, 0);
    firstEngine.render();
    assert.equal(updates.length, 2);
    const secondEngine = runtime.engines[1];
    secondEngine.frameId = 10;
    secondEngine.render();
    assert.equal(updates.length, 3);
    runtime.GameRuntime.dispose();
    assert.equal(updates.at(-1).fps, 0);
    secondEngine.render();
    assert.equal(updates.length, 4);
});

test('runtime publishes initial health, damage, healing, death, and resets between sessions', async t => {
    const runtime = createRuntime(() => Promise.resolve());
    const updates = [];
    const subscription = runtime.playerHealth$.subscribe(health => updates.push({ ...health }));
    t.after(() => {
        subscription.unsubscribe();
        runtime.GameRuntime.dispose();
    });
    assert.deepEqual(updates.at(-1), { current: 0, max: 0 });
    await runtime.GameRuntime.start({});
    assert.deepEqual(updates.at(-1), { current: 100, max: 100 });
    const engine = runtime.engines[0];
    const player = runtime.players[0];
    const initialUpdateCount = updates.length;
    engine.render();
    assert.equal(updates.length, initialUpdateCount);
    player.health = 75;
    engine.render();
    assert.deepEqual(updates.at(-1), { current: 75, max: 100 });
    player.health = 90;
    engine.render();
    assert.deepEqual(updates.at(-1), { current: 90, max: 100 });
    player.health = 0;
    engine.render();
    assert.deepEqual(updates.at(-1), { current: 0, max: 100 });
    await runtime.GameRuntime.start({});
    assert.deepEqual(updates.at(-2), { current: 0, max: 0 });
    assert.deepEqual(updates.at(-1), { current: 100, max: 100 });
    const restartUpdateCount = updates.length;
    engine.render();
    assert.equal(updates.length, restartUpdateCount);
    runtime.GameRuntime.dispose();
    assert.deepEqual(updates.at(-1), { current: 0, max: 0 });
});

function createSessionService({ GameRuntime, debugStats$, playerHealth$ }, t) {
    const destroyRef = {};
    const uiStoreToken = {};
    const errors = [];
    const destroyCallbacks = [];
    const { GameRuntimeService } = loadTypeScript('../src/app/core/game-runtime/game-runtime.service.ts', {
        '@angular/core': { Service: () => target => target, signal },
        '../../../game/runtime/game-runtime': { GameRuntime },
        '../../../game/runtime/game-observables': { debugStats$, playerHealth$ },
        '../../../game/runtime/menu-runtime': { MenuRuntime: class {} },
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
    const injector = Injector.create({ providers: [] });
    t.after(() => injector.destroy());
    const engine = runInInjectionContext(injector, () => new GameRuntimeService());
    const instances = new Map([
        [GameRuntimeService, engine],
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
    return { service: new GameSessionService(), engine, ui, errors, destroyCallbacks };
}

test('the Angular service ignores old startup errors and disposes the current session on destruction', async t => {
    const oldAssets = deferred();
    let loadCount = 0;
    const runtime = createRuntime(() => ++loadCount === 1 ? oldAssets.promise : Promise.resolve());
    const { service, engine, ui, errors, destroyCallbacks } = createSessionService(runtime, t);
    const firstStartup = service.start({});
    await service.start({});
    oldAssets.reject(new Error('obsolete failure'));
    await firstStartup;
    assert.equal(ui.error, undefined);
    assert.equal(errors.length, 0);
    assert.equal(runtime.engines[1].isRunning, true);
    runtime.engines[1].frameId = 10;
    runtime.engines[1].render();
    assert.equal(engine.stats().fps, 60);
    destroyCallbacks.forEach(callback => callback());
    assert.equal(runtime.engines[1].isDisposed, true);
    runtime.engines[1].render();
    assert.equal(engine.stats().fps, 0);
});

test('the Angular service reports a current startup failure after releasing its resources', async t => {
    const error = new Error('current failure');
    const runtime = createRuntime(() => Promise.reject(error));
    const { service, engine, ui, errors } = createSessionService(runtime, t);
    await service.start({});
    assert.equal(ui.error, error);
    assert.deepEqual(errors, [error]);
    assert.equal(runtime.engines[0].isDisposed, true);
    assert.equal(engine.stats().fps, 0);
    service.dispose();
});
