import assert from 'node:assert/strict';
import test from 'node:test';
import { computed, signal } from '@angular/core';
import { loadTypeScript } from './load-typescript.mjs';

function createVignette(t, current = 40, max = 40) {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let callback;
    let cleanup;
    const flush = () => {
        cleanup?.();
        cleanup = undefined;
        callback(onCleanup => cleanup = onCleanup);
    };
    const { DamageVignetteComponent } = loadTypeScript('../src/app/features/gameplay/damage-vignette/damage-vignette.component.ts', {
        '@angular/core': {
            Component: () => target => target,
            computed,
            signal,
            input: { required: () => signal(0) },
            effect: effectCallback => callback = effectCallback,
        },
    });
    const vignette = new DamageVignetteComponent();
    const updateHealth = (current, max = vignette.max()) => {
        vignette.current.set(current);
        vignette.max.set(max);
        flush();
    };
    updateHealth(current, max);
    t.after(() => cleanup?.());
    return { vignette, updateHealth, destroy: () => cleanup?.() };
}

test('health loss pulses the vignette while healing, unchanged health, and initialization do not', t => {
    const { vignette, updateHealth } = createVignette(t);
    assert.equal(vignette.opacity(), 0);
    updateHealth(30);
    assert.equal(vignette.isTakingDamage(), true);
    assert.equal(vignette.opacity(), 0.65);
    t.mock.timers.tick(179);
    assert.equal(vignette.opacity(), 0.65);
    t.mock.timers.tick(1);
    assert.equal(vignette.isTakingDamage(), false);
    assert.equal(vignette.opacity(), 0);
    updateHealth(30);
    assert.equal(vignette.opacity(), 0);
    updateHealth(35);
    assert.equal(vignette.opacity(), 0);
});

test('one heart or less keeps a lighter vignette that heals away and resets between sessions', t => {
    const { vignette, updateHealth } = createVignette(t, 10);
    assert.equal(vignette.isTakingDamage(), false, 'Mounting at low health must not simulate a hit');
    assert.equal(vignette.opacity(), 0.18);
    updateHealth(5);
    assert.equal(vignette.opacity(), 0.65);
    t.mock.timers.tick(180);
    assert.equal(vignette.opacity(), 0.18);
    updateHealth(11);
    assert.equal(vignette.opacity(), 0, 'Healing above one heart clears the persistent tint');
    updateHealth(0);
    t.mock.timers.tick(180);
    assert.equal(vignette.opacity(), 0.18, 'Zero hearts also retains the low-health tint until reset');
    updateHealth(0, 0);
    assert.equal(vignette.opacity(), 0, 'An inactive session must not show a vignette');
    updateHealth(40, 40);
    assert.equal(vignette.opacity(), 0);
    updateHealth(10);
    updateHealth(0, 0);
    updateHealth(40, 40);
    t.mock.timers.tick(500);
    assert.equal(vignette.opacity(), 0, 'A previous hit must not survive a replay');
});

test('rapid hits extend one pulse and component destruction cancels its pending timer', t => {
    const { vignette, updateHealth, destroy } = createVignette(t);
    updateHealth(35);
    t.mock.timers.tick(120);
    updateHealth(30);
    t.mock.timers.tick(60);
    assert.equal(vignette.opacity(), 0.65, 'The first hit timer must not end the next hit pulse');
    t.mock.timers.tick(119);
    assert.equal(vignette.opacity(), 0.65);
    t.mock.timers.tick(1);
    assert.equal(vignette.opacity(), 0);
    updateHealth(25);
    destroy();
    t.mock.timers.tick(500);
    assert.equal(vignette.isTakingDamage(), true, 'Destroyed components must not receive timer updates');
});
