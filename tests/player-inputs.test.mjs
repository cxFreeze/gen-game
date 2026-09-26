import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript } from './load-typescript.mjs';

class Element extends EventTarget {
    constructor(isInteractive = false) {
        super();
        this.isInteractive = isInteractive;
    }
    matches() {
 return this.isInteractive; 
}
    getBoundingClientRect() {
 return { left: 0, top: 0, width: 800, height: 600 }; 
}
}

function event(type, properties = {}) {
    const result = new Event(type);
    Object.assign(result, properties);
    return result;
}

function createInputs() {
    const window = new EventTarget();
    const document = new EventTarget();
    const canvas = new Element();
    const { PlayerInputs } = loadTypeScript('../src/game/player-inputs.ts', {
        '@babylonjs/core/Misc/virtualJoystick': { VirtualJoystick: class {} },
    }, { window, document, HTMLElement: Element });
    PlayerInputs.init(canvas);
    return { PlayerInputs, window, document, canvas };
}

test('only a primary canvas pointer starts firing; cancellation and blur release it', () => {
    const { PlayerInputs, window, canvas } = createInputs();
    let shots = 0;
    const subscription = PlayerInputs.firePressed.subscribe(() => shots++);
    window.dispatchEvent(event('pointerdown', { button: 0, pointerId: 1 }));
    canvas.dispatchEvent(event('pointerdown', { button: 2, pointerId: 2 }));
    PlayerInputs.checkInputs();
    assert.equal(shots, 0);
    canvas.dispatchEvent(event('pointerdown', { button: 0, pointerId: 3, clientX: 400, clientY: 300 }));
    PlayerInputs.checkInputs();
    assert.equal(shots, 1);
    window.dispatchEvent(event('pointercancel', { pointerId: 3 }));
    PlayerInputs.checkInputs();
    assert.equal(shots, 1);
    canvas.dispatchEvent(event('pointerdown', { button: 0, pointerId: 4, clientX: 400, clientY: 300 }));
    window.dispatchEvent(event('blur'));
    PlayerInputs.checkInputs();
    assert.equal(shots, 1);
    subscription.unsubscribe();
    PlayerInputs.dispose();
});

test('disposal removes listeners and reinitialization does not duplicate pointer tracking', () => {
    const { PlayerInputs, window, canvas } = createInputs();
    let aimUpdates = 0;
    const subscription = PlayerInputs.aimChanged.subscribe(() => aimUpdates++);
    window.dispatchEvent(event('keydown', { code: 'KeyW' }));
    assert.equal(PlayerInputs.forwardPressed, true);
    PlayerInputs.dispose();
    window.dispatchEvent(event('keydown', { code: 'KeyW' }));
    canvas.dispatchEvent(event('pointermove', { clientX: 450, clientY: 320 }));
    assert.equal(PlayerInputs.forwardPressed, false);
    assert.equal(aimUpdates, 0);
    PlayerInputs.init(canvas);
    PlayerInputs.init(canvas);
    canvas.dispatchEvent(event('pointermove', { clientX: 450, clientY: 320 }));
    assert.equal(aimUpdates, 1);
    subscription.unsubscribe();
    PlayerInputs.dispose();
});

test('keyboard input on an interactive control is ignored and hidden tabs release held keys', () => {
    const { PlayerInputs, window, document } = createInputs();
    const button = new Element(true);
    window.dispatchEvent(event('keydown', { code: 'KeyW', composedPath: () => [button, window] }));
    assert.equal(PlayerInputs.forwardPressed, false);
    window.dispatchEvent(event('keydown', { code: 'ArrowUp' }));
    window.dispatchEvent(event('keydown', { code: 'KeyW' }));
    window.dispatchEvent(event('keyup', { code: 'KeyW' }));
    assert.equal(PlayerInputs.forwardPressed, true);
    document.hidden = true;
    document.dispatchEvent(event('visibilitychange'));
    assert.equal(PlayerInputs.forwardPressed, false);
    PlayerInputs.dispose();
});
