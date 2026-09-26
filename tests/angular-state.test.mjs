import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, signal } from '@angular/core';
import { loadTypeScript } from './load-typescript.mjs';

const angular = { computed, signal, Service: () => target => target };

function createLoadingStore() {
    const { GameUiStore } = loadTypeScript('../src/app/game/game-ui.store.ts', {
        '@angular/core': angular,
    }, { Error });
    return new GameUiStore();
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
    const { DebugPanelService } = loadTypeScript('../src/app/game/debug-panel/debug-panel.service.ts', {
        '@angular/core': { ...angular, inject: token => token === engineToken ? engine : undefined },
        '../game-engine.service': { GameEngineService: engineToken },
    });
    return new DebugPanelService();
}

test('debug commands reflect engine state and ignore commands while the engine is unavailable', () => {
    const engine = {
        debugDefaults: { isVisible: false, showFps: true },
        toggleDuck: () => undefined,
        toggleTrees: () => false,
        toggleSkyView: () => true,
    };
    const debug = createDebugService(engine);
    debug.toggleDuck();
    assert.equal(debug.isDuckVisible(), true);
    debug.toggleTrees();
    debug.toggleSkyView();
    assert.equal(debug.areTreesVisible(), false);
    assert.equal(debug.isSkyView(), true);
    debug.togglePanel();
    assert.equal(debug.isVisible(), true);
    const stats = { fps: 60, worldX: 10.2, worldY: -5.8, meshCount: 25, polygonCount: 90 };
    debug.updateStats(stats);
    stats.fps = 0;
    assert.equal(debug.fps(), 60);
    assert.equal(debug.worldPosition(), '10 / -6');
    debug.initialize('new-session');
    assert.equal(debug.seed(), 'new-session');
    assert.equal(debug.isVisible(), false);
    assert.equal(debug.fps(), 0);
    assert.equal(debug.areTreesVisible(), true);
    assert.equal(debug.isSkyView(), false);
    assert.equal(debug.fps.set, undefined);
    assert.equal(debug.isVisible.set, undefined);
});
