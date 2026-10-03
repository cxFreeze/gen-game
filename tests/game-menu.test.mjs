import assert from 'node:assert/strict';
import test from 'node:test';
import { signal, untracked } from '@angular/core';
import { loadTypeScript } from './load-typescript.mjs';

const component = () => target => target;
function output() {
    const listeners = new Set();
    return {
        emissions: 0,
        emit() {
            this.emissions++;
            for (const listener of listeners) {
                listener();
            }
        },
        subscribe(listener) {
            listeners.add(listener);
            return { unsubscribe: () => listeners.delete(listener) };
        },
    };
}

function createMenu(dialog) {
    const { GameMenuComponent } = loadTypeScript('../src/app/features/gameplay/game-menu/game-menu.component.ts', {
        '@angular/core': {
            Component: component,
            input: signal,
            output,
            inject: () => dialog,
        },
        '../../../shared/button/button.directive': { ButtonDirective: class {} },
        '../../../shared/services/dialog-context': { DialogContext: class {} },
    });
    return new GameMenuComponent();
}

test('each menu action emits before closing its injected dialog', () => {
    for (const action of ['resume', 'replay', 'mainMenu']) {
        let closeCount = 0;
        const menu = createMenu({ close: () => closeCount++ });
        menu[action].subscribe(() => assert.equal(closeCount, 0));
        menu.closeMenu(menu[action]);
        assert.equal(menu[action].emissions, 1);
        assert.equal(closeCount, 1);
        for (const otherAction of ['resume', 'replay', 'mainMenu'].filter(value => value !== action)) {
            assert.equal(menu[otherAction].emissions, 0);
        }
    }
});

function createOverlay() {
    const runtimeToken = {};
    const sessionToken = {};
    const dialogsToken = {};
    const isPaused = signal(false);
    const isGameOver = signal(false);
    const openedDialogs = [];
    let cleanup;
    let flush;
    const dependencies = new Map([
        [runtimeToken, { playerHealth: signal({ current: 100, max: 100 }), isGameOver, isPaused }],
        [sessionToken, {
            togglePause: () => {
                if (!isGameOver()) {
                    isPaused.update(value => !value);
                }
            },
            resume: () => isPaused.set(false),
        }],
        [dialogsToken, {
            open(component, position, options) {
                const dialog = {
                    component,
                    position,
                    options,
                    isClosed: false,
                    close() { this.isClosed = true; },
                    outputs: { resume: output(), replay: output(), mainMenu: output() },
                };
                openedDialogs.push(dialog);
                return dialog;
            },
        }],
    ]);
    const { GameOverlayComponent } = loadTypeScript('../src/app/features/gameplay/game-overlay/game-overlay.component.ts', {
        '@angular/core': {
            Component: component,
            output,
            untracked,
            inject: token => dependencies.get(token),
            effect(callback) {
                flush = () => {
                    cleanup?.();
                    cleanup = undefined;
                    callback(onCleanup => cleanup = onCleanup);
                };
                flush();
            },
        },
        '../../../core/game-runtime/game-runtime.service': { GameRuntimeService: runtimeToken },
        '../../../shared/services/dialog.service': { DialogService: dialogsToken },
        '../game-session.service': { GameSessionService: sessionToken },
        '../game-menu/game-menu.component': { GameMenuComponent: class {} },
        '../health-bar/health-bar.component': { HealthBarComponent: class {} },
        '../../debug/debug-panel/debug-panel.component': { DebugPanelComponent: class {} },
    }, { KeyboardEvent: Event });
    const overlay = new GameOverlayComponent();
    return { overlay, isPaused, isGameOver, openedDialogs, flush: () => flush(), destroy: () => cleanup?.() };
}

test('Escape toggles pause once per press and prevents native dismissal from toggling it twice', () => {
    const { overlay, isPaused } = createOverlay();
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

test('the overlay opens pause and Game Over through the service and cleans up on state changes and destruction', () => {
    const { overlay, isPaused, isGameOver, openedDialogs, flush, destroy } = createOverlay();
    assert.equal(openedDialogs.length, 0);
    isPaused.set(true);
    flush();
    const pauseDialog = openedDialogs[0];
    assert.equal(pauseDialog.position, 'middle');
    assert.equal(pauseDialog.options.closeOnEscape, false);
    assert.equal(pauseDialog.options.ariaLabel, 'Paused');
    assert.equal(pauseDialog.options.inputs.mode, 'pause');
    assert.equal('componentRef' in pauseDialog, false);
    pauseDialog.outputs.resume.emit();
    assert.equal(isPaused(), false);
    flush();
    assert.equal(pauseDialog.isClosed, true);
    assert.equal(openedDialogs.length, 1);

    isPaused.set(true);
    flush();
    isGameOver.set(true);
    flush();
    assert.equal(openedDialogs[1].isClosed, true);
    const gameOverDialog = openedDialogs[2];
    assert.equal(gameOverDialog.options.inputs.mode, 'game-over');
    assert.equal(gameOverDialog.options.ariaLabel, 'Game Over');
    gameOverDialog.outputs.replay.emit();
    gameOverDialog.outputs.mainMenu.emit();
    assert.equal(overlay.replay.emissions, 1);
    assert.equal(overlay.mainMenu.emissions, 1);
    overlay.onEscape(new Event('keydown', { cancelable: true }));
    assert.equal(isGameOver(), true);
    destroy();
    assert.equal(gameOverDialog.isClosed, true);
});
