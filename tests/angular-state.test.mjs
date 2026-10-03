import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, Injector, runInInjectionContext, signal } from '@angular/core';
import { loadTypeScript } from './load-typescript.mjs';

const angular = { computed, signal, Service: () => target => target };

function createLoadingStore() {
    const { GameUiService } = loadTypeScript('../src/app/features/gameplay/game-ui.service.ts', {
        '@angular/core': angular,
    }, { Error });
    return new GameUiService();
}

test('loading errors remain visible and cannot be overwritten by a late ready notification', () => {
    const store = createLoadingStore();
    store.failLoading(new Error('asset unavailable'));
    assert.equal(store.isLoading(), false);
    assert.equal(store.hasLoadingOverlay(), true);
    assert.equal(store.loadingError(), 'asset unavailable');
    store.finishLoading();
    assert.equal(store.status(), 'error');
    store.initialize();
    assert.equal(store.status(), 'loading');
    assert.equal(store.loadingError(), null);
    store.finishLoading();
    assert.equal(store.status(), 'ready');
    assert.equal(store.hasLoadingOverlay(), false);
    assert.equal(store.state.set, undefined);
});

test('unknown startup failures have a useful message', () => {
    const store = createLoadingStore();
    store.failLoading(null);
    assert.equal(store.status(), 'error');
    assert.equal(store.loadingError(), 'Unable to initialize the game');
});

function createDebugService(engine) {
    const engineToken = {};
    const { DebugPanelService } = loadTypeScript('../src/app/features/debug/debug-panel.service.ts', {
        '@angular/core': { ...angular, inject: token => token === engineToken ? engine : undefined },
        '../../core/game-runtime/game-runtime.service': { GameRuntimeService: engineToken },
    });
    return new DebugPanelService();
}

function createEngine(t) {
    const observables = loadTypeScript('../src/game/runtime/game-observables.ts');
    const runtime = {
        isReady: false,
        debug: {
            toggleCharMesh: () => false,
            toggle3ditems: () => false,
            toggleSkyview: () => true,
        },
        start(canvas) {
            assert.equal(arguments.length, 1);
            this.dispose();
            this.isReady = true;
            return Promise.resolve();
        },
        dispose() {
            this.isReady = false;
            observables.resetDebugStats();
            observables.resetPlayerHealth();
        },
    };
    const { GameRuntimeService } = loadTypeScript('../src/app/core/game-runtime/game-runtime.service.ts', {
        '@angular/core': angular,
        '../../../game/runtime/game-runtime': { GameRuntime: runtime },
        '../../../game/runtime/game-observables': observables,
        '../../../game/runtime/menu-runtime': { MenuRuntime: class {} },
        '../../../game/runtime/game-seed': { GameSeed: class { value = 'test-session'; } },
    });
    const injector = Injector.create({ providers: [] });
    t.after(() => {
        if (!injector.destroyed) {
            injector.destroy();
        }
    });
    const engine = runInInjectionContext(injector, () => new GameRuntimeService());
    return { engine, runtime, injector, ...observables };
}

test('debug reads observable telemetry and keeps panel visibility across sessions', async t => {
    const { engine, publishDebugStats } = createEngine(t);
    const debug = createDebugService(engine);
    debug.toggleDuck();
    assert.equal(debug.isDuckVisible(), true);
    engine.createSeed();
    await engine.start({});
    debug.toggleTrees();
    debug.toggleSkyView();
    assert.equal(debug.areTreesVisible(), false);
    assert.equal(debug.isSkyView(), true);
    debug.togglePanel();
    assert.equal(debug.isVisible(), true);
    const stats = { fps: 60, worldX: 10.2, worldY: -5.8, meshCount: 25, polygonCount: 90 };
    publishDebugStats(stats);
    stats.fps = 0;
    assert.equal(debug.fps(), 60);
    assert.equal(debug.worldPosition(), '10 / -6');
    assert.equal(debug.seed(), 'test-session');
    engine.dispose();
    assert.equal(debug.isVisible(), true);
    assert.equal(debug.fps(), 0);
    assert.equal(debug.seed(), '');
    assert.equal(debug.areTreesVisible(), true);
    assert.equal(debug.isSkyView(), false);
    assert.equal(debug.fps.set, undefined);
    assert.equal(debug.isVisible.set, undefined);
    assert.equal(engine.stats.set, undefined);
    assert.equal(engine.controls.set, undefined);
});

test('statistics have an initial value and reset on restart and disposal', async t => {
    const { engine, runtime, publishDebugStats } = createEngine(t);
    const stats = { fps: 60, worldX: 1, worldY: 2, meshCount: 3, polygonCount: 4 };
    assert.equal(engine.stats().fps, 0);
    await engine.start({});
    publishDebugStats(stats);
    assert.equal(engine.stats().fps, 60);
    await engine.start({});
    assert.equal(engine.stats().fps, 0);
    publishDebugStats(stats);
    assert.equal(engine.stats().fps, 60);
    runtime.dispose();
    assert.equal(engine.stats().fps, 0);
    engine.dispose();
    assert.equal(engine.stats().fps, 0);
});

test('destroying the Angular injector closes the statistics subscription', async t => {
    const { engine, injector, publishDebugStats } = createEngine(t);
    await engine.start({});
    const stats = { fps: 60, worldX: 1, worldY: 2, meshCount: 3, polygonCount: 4 };
    publishDebugStats(stats);
    injector.destroy();
    publishDebugStats({ ...stats, fps: 10 });
    assert.equal(engine.stats().fps, 60);
    engine.dispose();
});

test('player health reaches Angular without duplicate updates and releases its subscription', t => {
    const { engine, injector, playerHealth$, publishPlayerHealth, resetPlayerHealth } = createEngine(t);
    const updates = [];
    const subscription = playerHealth$.subscribe(health => updates.push({ ...health }));
    t.after(() => subscription.unsubscribe());
    assert.deepEqual({ ...engine.playerHealth() }, { current: 0, max: 0 });
    const health = { current: 3, max: 5 };
    publishPlayerHealth(health);
    health.current = 0;
    assert.deepEqual({ ...engine.playerHealth() }, { current: 3, max: 5 });
    publishPlayerHealth({ current: 3, max: 5 });
    assert.equal(updates.length, 2);
    publishPlayerHealth({ current: 3, max: 6 });
    assert.deepEqual({ ...engine.playerHealth() }, { current: 3, max: 6 });
    resetPlayerHealth();
    assert.deepEqual({ ...engine.playerHealth() }, { current: 0, max: 0 });
    publishPlayerHealth({ current: 5, max: 5 });
    injector.destroy();
    publishPlayerHealth({ current: 1, max: 5 });
    assert.deepEqual({ ...engine.playerHealth() }, { current: 5, max: 5 });
    assert.equal(engine.playerHealth.set, undefined);
    engine.dispose();
});

test('game over appears only for a dead player and resets on replay and disposal', async t => {
    const { engine, publishPlayerHealth } = createEngine(t);
    assert.equal(engine.isGameOver(), false);
    await engine.start({});
    assert.equal(engine.isGameOver(), false);
    publishPlayerHealth({ current: 5, max: 5 });
    assert.equal(engine.isGameOver(), false);
    publishPlayerHealth({ current: 1, max: 5 });
    assert.equal(engine.isGameOver(), false);
    publishPlayerHealth({ current: 0, max: 5 });
    assert.equal(engine.isGameOver(), true);
    await engine.start({});
    assert.equal(engine.isGameOver(), false);
    publishPlayerHealth({ current: 5, max: 5 });
    assert.equal(engine.isGameOver(), false);
    publishPlayerHealth({ current: 0, max: 5 });
    assert.equal(engine.isGameOver(), true);
    engine.dispose();
    assert.equal(engine.isGameOver(), false);
});
