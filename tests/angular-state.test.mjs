import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, signal } from '@angular/core';
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
        '../../core/game-engine/game-engine.service': { GameEngineService: engineToken },
    });
    return new DebugPanelService();
}

function createEngine() {
    const callbacks = [];
    const runtime = {
        isReady: false,
        start(canvas, updateStats) {
            this.isReady = true;
            callbacks.push(updateStats);
            return Promise.resolve();
        },
        dispose() {
            this.isReady = false;
        },
    };
    const { GameEngineService } = loadTypeScript('../src/app/core/game-engine/game-engine.service.ts', {
        '@angular/core': angular,
        '../../../engine/runtime/game-runtime': { GameRuntime: runtime },
        '../../../engine/runtime/debug': { DebugManager: { getInstance: () => ({
            toggleCharMesh: () => false,
            toggle3ditems: () => false,
            toggleSkyview: () => true,
        }) } },
        '../../../engine/utils/random': { Random: { setSeed() {}, seed: 'test-session' } },
    });
    return { engine: new GameEngineService(), callbacks };
}

test('debug reads engine telemetry directly and keeps visibility preferences across sessions', async () => {
    const { engine, callbacks } = createEngine();
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
    callbacks[0](stats);
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

test('statistics from obsolete or stopped engine sessions are ignored', async () => {
    const { engine, callbacks } = createEngine();
    await engine.start({});
    await engine.start({});
    callbacks[1]({ fps: 60, worldX: 1, worldY: 2, meshCount: 3, polygonCount: 4 });
    callbacks[0]({ fps: 10, worldX: 9, worldY: 9, meshCount: 9, polygonCount: 9 });
    assert.equal(engine.stats().fps, 60);
    engine.dispose();
    callbacks[1]({ fps: 100, worldX: 0, worldY: 0, meshCount: 0, polygonCount: 0 });
    assert.equal(engine.stats().fps, 0);
});
