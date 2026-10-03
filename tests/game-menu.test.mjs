import assert from 'node:assert/strict';
import test from 'node:test';
import { signal } from '@angular/core';
import { loadTypeScript } from './load-typescript.mjs';

const component = () => target => target;
const output = () => ({ emissions: 0, emit() { this.emissions++; } });

function createMenu() {
    const { GameMenuComponent } = loadTypeScript('../src/app/features/gameplay/game-menu/game-menu.component.ts', {
        '@angular/core': {
            Component: component,
            input: signal,
            output,
            viewChild: { required: () => () => undefined },
            afterNextRender() {},
        },
        '../../../shared/button/button.directive': { ButtonDirective: class {} },
    });
    return new GameMenuComponent();
}

test('native dialog dismissal resumes pause and keeps Game Over open', () => {
    const menu = createMenu();
    const gameOverCancel = new Event('cancel', { cancelable: true });
    menu.onCancel(gameOverCancel);
    assert.equal(gameOverCancel.defaultPrevented, true);
    assert.equal(menu.resume.emissions, 0);
    menu.mode.set('pause');
    const pauseCancel = new Event('cancel', { cancelable: true });
    menu.onCancel(pauseCancel);
    assert.equal(pauseCancel.defaultPrevented, true);
    assert.equal(menu.resume.emissions, 1);
});

test('Escape toggles pause once per press and prevents native dismissal from toggling it twice', () => {
    const runtimeToken = {};
    const sessionToken = {};
    const isPaused = signal(false);
    const dependencies = new Map([
        [runtimeToken, { playerHealth: signal({ current: 100, max: 100 }), isGameOver: signal(false), isPaused }],
        [sessionToken, { togglePause: () => isPaused.update(value => !value) }],
    ]);
    const { GameOverlayComponent } = loadTypeScript('../src/app/features/gameplay/game-overlay/game-overlay.component.ts', {
        '@angular/core': { Component: component, output, inject: token => dependencies.get(token) },
        '../../../core/game-runtime/game-runtime.service': { GameRuntimeService: runtimeToken },
        '../game-session.service': { GameSessionService: sessionToken },
        '../game-menu/game-menu.component': { GameMenuComponent: class {} },
        '../health-bar/health-bar.component': { HealthBarComponent: class {} },
        '../../debug/debug-panel/debug-panel.component': { DebugPanelComponent: class {} },
    }, { KeyboardEvent: Event });
    const overlay = new GameOverlayComponent();
    const escape = repeat => Object.assign(new Event('keydown', { cancelable: true }), { repeat });
    const firstPress = escape(false);
    overlay.onEscape(firstPress);
    assert.equal(isPaused(), true);
    assert.equal(firstPress.defaultPrevented, true);
    const heldPress = escape(true);
    overlay.onEscape(heldPress);
    assert.equal(isPaused(), true);
    assert.equal(heldPress.defaultPrevented, true);
    overlay.onEscape(escape(false));
    assert.equal(isPaused(), false);
    const handledPress = escape(false);
    handledPress.preventDefault();
    overlay.onEscape(handledPress);
    assert.equal(isPaused(), false);
});
