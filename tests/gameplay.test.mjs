import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import test from 'node:test';
import ts from 'typescript';
import { CharacterState } from '../src/game/gameplay/characters/character-state.ts';
import { getPlayerMovement } from '../src/game/gameplay/player/player-movement.ts';
import { playerConfig } from '../src/game/gameplay/player/player-config.ts';
import { ProjectileTrajectory } from '../src/game/gameplay/projectiles/projectile-trajectory.ts';
import { isInWorldBounds, isInChunkBounds } from '../src/game/gameplay/world/world-bounds.ts';
import { distanceBetween, distanceSquared } from '../src/game/math/position.ts';
import { loadTypeScript } from './load-typescript.mjs';

const { EnemyMovement } = loadTypeScript('../src/game/gameplay/enemies/enemy-movement.ts', {
    '../../math/position': { distanceBetween, distanceSquared },
});
const { EnemyCombat } = loadTypeScript('../src/game/gameplay/enemies/enemy-combat.ts', {
    '../../math/position': { distanceBetween },
});

test('damage, healing, death, and firing cooldowns work without a rendered character', () => {
    const state = new CharacterState(playerConfig.stats);
    state.takeDamage(25);
    assert.equal(state.health, playerConfig.stats.health - 25);
    state.takeDamage(-100);
    assert.equal(state.health, playerConfig.stats.health);
    assert.equal(state.canFire(1000, false), false);
    assert.equal(state.canFire(1000), true);
    assert.equal(state.canFire(1500), false);
    assert.equal(state.canFire(1501), true);
    state.takeDamage(200);
    assert.equal(state.health, 0);
    assert.equal(state.isDead, true);
    state.takeDamage(-100);
    assert.equal(state.health, 0);
    assert.equal(state.canFire(5000), false);
});

test('movement preserves speed diagonally and cancels opposing inputs', () => {
    const idle = { forwardPressed: false, backwardsPressed: false, leftPressed: false, rightPressed: false };
    assert.equal(getPlayerMovement(idle, 85, 1000), null);
    assert.equal(getPlayerMovement({ ...idle, forwardPressed: true, backwardsPressed: true }, 85, 1000), null);
    assert.equal(getPlayerMovement({ ...idle, leftPressed: true, rightPressed: true }, 85, 1000), null);
    const forward = getPlayerMovement({ ...idle, forwardPressed: true }, 85, 1000);
    assert.deepEqual(forward, { x: 0, z: 85, direction: 'back' });
    const diagonal = getPlayerMovement({ ...idle, forwardPressed: true, leftPressed: true }, 85, 1000);
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 85) < 1e-10);
    assert.equal(diagonal.direction, 'front-left');
    const sideways = getPlayerMovement({ ...idle, forwardPressed: true, backwardsPressed: true, rightPressed: true }, 85, 500);
    assert.deepEqual(sideways, { x: -42.5, z: 0, direction: 'right' });
});

test('trajectory captures getter-based coordinates and stops at range or an obstacle', () => {
    let originX = 10;
    const origin = { get x() {
 return originX; 
}, get y() {
 return 4; 
}, get z() {
 return 20; 
} };
    const infos = { speed: 2, direction: Math.PI / 2, damage: 10, range: 120 };
    const trajectory = new ProjectileTrajectory(infos, origin, 1000, Infinity);
    originX = 999;
    const midway = trajectory.sample(1500);
    assert.equal(midway.position.x, 40);
    assert.equal(midway.position.y, 4);
    assert.ok(Math.abs(midway.position.z - 20) < 1e-10);
    assert.equal(midway.hasReachedLimit, false);
    assert.equal(trajectory.sample(3000).hasReachedLimit, false);
    assert.equal(trajectory.sample(3001).hasReachedLimit, true);
    const blocked = new ProjectileTrajectory(infos, origin, 1000, 25);
    assert.equal(blocked.sample(1500).hasReachedLimit, true);
});

function createEnemy({ position = { x: 0, y: 0, z: 0 }, canMove = () => true } = {}) {
    let currentPosition = { ...position };
    const requests = [];
    const body = {
        name: 'enemy-1',
        get position() {
 return currentPosition; 
},
        rotation: 0,
        moveBy(x, z, isPositionValid) {
            const next = { x: currentPosition.x + x, y: currentPosition.y, z: currentPosition.z + z };
            requests.push({ x, z, isValid: isPositionValid(next) });
            if (isPositionValid(next) && canMove(next)) {
                currentPosition = next;
            }
        },
    };
    const enemyType = { maxSpawnDistance: 500, detectionRange: 200, stats: { ...playerConfig.stats, range: 100 } };
    const movement = new EnemyMovement(body, { x: 0, y: 0, z: 0 }, enemyType);
    return { body, movement, requests };
}

test('enemy switches between attack, chase, and patrol and caps a delayed update', () => {
    const { body, movement, requests } = createEnemy();
    movement.update({ x: 0, y: 0, z: 100 }, true, true, 100);
    assert.equal(movement.mode, 'attack');
    assert.equal(requests.length, 0);
    movement.update({ x: 0, y: 0, z: 200 }, true, false, 1000);
    assert.equal(movement.mode, 'chase');
    assert.equal(body.position.z, 3);
    movement.update({ x: 0, y: 0, z: 200 }, false, false, 100);
    assert.equal(movement.mode, 'passive');
});

test('enemy responds to collision feedback with avoidance', () => {
    const { movement, requests } = createEnemy({ canMove: () => false });
    for (let frame = 0; frame < 4; frame++) {
        movement.update({ x: 0, y: 0, z: 150 }, true, false, 100);
    }
    assert.equal(movement.mode, 'chase');
    assert.ok(requests.some(request => Math.abs(request.x) > 0.1));
});

test('enemy combat limits visibility queries and only fires within range with a clear aim', () => {
    const combat = new EnemyCombat(100);
    const position = { x: 0, y: 0, z: 0 };
    const target = { x: 0, y: 0, z: 50 };
    let queries = 0;
    const visible = () => {
        queries++;
        return true;
    };
    assert.equal(combat.prepare(position, target, true, 0, visible).shouldAttemptFire, true);
    assert.equal(combat.canFire(position, 0), true);
    assert.equal(combat.canFire(position, Math.PI), false);
    assert.equal(combat.prepare(position, target, true, 100, visible).shouldAttemptFire, false);
    assert.equal(queries, 1);
    combat.prepare(position, target, true, 50, () => false);
    assert.equal(combat.canFire(position, 0), false);
    assert.equal(combat.prepare(position, { x: 0, y: 0, z: 101 }, true, 150, visible).shouldAttemptFire, false);
    assert.equal(queries, 1);
    assert.equal(combat.prepare(position, target, false, 150, visible).shouldAttemptFire, false);
    assert.equal(queries, 1);
});

test('patrol permits returning toward spawn when outside its allowed area', () => {
    const { body, movement, requests } = createEnemy({ position: { x: 0, y: 0, z: 600 } });
    body.rotation = Math.PI;
    movement.update({ x: 0, y: 0, z: 2000 }, false, false, 100);
    assert.equal(movement.mode, 'passive');
    assert.equal(requests[0].isValid, true);
    assert.ok(body.position.z < 600);
});

test('world and chunk boundaries keep their strict edge semantics', () => {
    assert.equal(isInWorldBounds(49, -49, 100), true);
    assert.equal(isInWorldBounds(50, 0, 100), false);
    assert.equal(isInWorldBounds(0, -50, 100), false);
    assert.equal(isInChunkBounds({ minX: -49, maxX: 49, minY: -49, maxY: 49 }, 0, 0, 100), true);
    assert.equal(isInChunkBounds({ minX: -50, maxX: 49, minY: -49, maxY: 49 }, 0, 0, 100), false);
});

test('all gameplay and math modules type-check independently without browser APIs', () => {
    function sources(directory) {
        return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const file = path.join(directory, entry.name);
            return entry.isDirectory() ? sources(file) : file.endsWith('.ts') ? [file] : [];
        });
    }
    const roots = [...sources('src/game/gameplay'), ...sources('src/game/math')];
    const program = ts.createProgram(roots, {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        types: [],
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        lib: ['lib.es2022.d.ts'],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: file => file,
        getCurrentDirectory: cwd,
        getNewLine: () => '\n',
    }));
});
