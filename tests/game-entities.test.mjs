import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript } from './load-typescript.mjs';

const { Character } = loadTypeScript('../src/game/gameplay/characters/character.ts');
const { Player } = loadTypeScript('../src/game/gameplay/player/player.ts');
const { Enemy } = loadTypeScript('../src/game/gameplay/enemies/enemy.ts');
const { EnemySystem } = loadTypeScript('../src/game/gameplay/enemies/enemy-system.ts');
const { ProjectileSystem } = loadTypeScript('../src/game/gameplay/projectiles/projectile-system.ts');
const { World } = loadTypeScript('../src/game/gameplay/world/world.ts');
const { Game } = loadTypeScript('../src/game/gameplay/game.ts');
const { playerConfig } = loadTypeScript('../src/game/gameplay/player/player-config.ts');

function createBody(name = 'player') {
    const body = {
        name,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        disposeCount: 0,
        presentations: [],
        translate(x, z) {
            body.position = { x: body.position.x + x, y: body.position.y, z: body.position.z + z };
        },
        setPosition(position) {
            body.position = { ...position };
        },
        rotate(rotation) {
            body.rotation = rotation;
        },
        intersectsProjectile: () => true,
        hasLineOfSight: () => true,
        present(state) {
            body.presentations.push(state);
        },
        dispose() {
            body.disposeCount++;
        },
    };
    return body;
}

test('character slides along a collision and restores a position rejected by gameplay', () => {
    const body = createBody();
    body.translate = (x, z) => {
        if (x === 0 || z === 0) {
            body.position = { x: body.position.x + x, y: 0, z: body.position.z + z };
        }
    };
    const character = new Character({ body, stats: playerConfig.stats, now: () => 1000, shoot() {} });
    character.moveBy(10, 10);
    assert.equal(character.position.x, 10);
    assert.equal(character.position.z, 0);
    character.moveBy(10, 0, () => false);
    assert.equal(character.position.x, 10);
    character.takeDamage(100);
    character.die();
    character.dispose();
    character.moveBy(10, 0);
    assert.equal(character.isDead, true);
    assert.equal(character.position.x, 10);
    assert.equal(body.disposeCount, 1);
});

test('player owns movement, firing cooldowns, and immunity to its own projectiles', () => {
    let now = 1000;
    const body = createBody();
    const shots = [];
    const player = new Player({ body, now: () => now, shoot: (infos, owner) => shots.push({ infos, owner }) });
    const commands = { forwardPressed: true, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: true };
    player.update(commands, 1000);
    assert.equal(player.position.z, 85);
    assert.equal(body.presentations[0].hasMoved, true);
    assert.equal(shots.length, 1);
    now = 1200;
    player.update({ ...commands, forwardPressed: false }, 100);
    assert.equal(shots.length, 1);
    now = 1501;
    player.update({ ...commands, forwardPressed: false }, 100);
    assert.equal(shots.length, 2);
    assert.equal(shots[0].owner, 'player');
    assert.equal(player.checkDamageCollisions({ id: 'own', ownerName: 'player', damage: 100 }), false);
    assert.equal(player.health, 100);
    assert.equal(player.checkDamageCollisions({ id: 'enemy', ownerName: 'enemy', damage: 100 }), true);
    assert.equal(player.isDead, true);
    now = 2500;
    player.update(commands, 1000);
    assert.equal(shots.length, 2);
    assert.equal(body.disposeCount, 1);
});

test('enemy combines detection, aim, line of sight, and firing in gameplay', () => {
    const body = createBody('enemy');
    const shots = [];
    const enemy = new Enemy({
        body,
        enemyType: { name: 'blob', detectionRange: 200, maxSpawnDistance: 500, stats: { ...playerConfig.stats, range: 100 } },
        now: () => 1000,
        shoot: (...shot) => shots.push(shot),
    });
    enemy.rotation = 0;
    enemy.update({ position: { x: 0, y: 0, z: 50 }, isDead: false }, 150);
    assert.equal(enemy.getMovementMode(), 'attack');
    assert.equal(shots.length, 1);
    body.hasLineOfSight = () => false;
    enemy.update({ position: { x: 0, y: 0, z: 50 }, isDead: false }, 150);
    assert.equal(shots.length, 1);
});

test('projectile system updates adjacent expired projectiles and never skips one', () => {
    let now = 1000;
    let impacts = 0;
    let disposed = 0;
    const manager = new ProjectileSystem({
        now: () => now,
        checkHit: () => false,
        createBody: () => ({ position: { x: 0, y: 0, z: 0 }, obstacleDistance: Infinity, setPosition() {}, showImpact: () => impacts++, dispose: () => disposed++ }),
    });
    const infos = { speed: 1, direction: 0, damage: 1, range: 1 };
    const first = manager.createProjectile(infos, 'enemy');
    const second = manager.createProjectile(infos, 'enemy');
    now = 1100;
    manager.updatePositions();
    assert.equal(first.isDestroyed, true);
    assert.equal(second.isDestroyed, true);
    assert.equal(impacts, 2);
    manager.dispose();
    assert.equal(disposed, 2);
});

function trackedEnemy(mode = 'passive') {
    return {
        isDead: false,
        updates: 0,
        disposals: 0,
        getMovementMode: () => mode,
        update() {
 this.updates++; 
},
        checkDamageCollisions: () => false,
        die() {
 this.isDead = true; 
},
        dispose() {
 this.disposals++; 
},
    };
}

test('enemy system remembers deaths, unloads passive enemies, and retains chasing enemies', () => {
    const manager = new EnemySystem({ position: { x: 0, y: 0, z: 0 }, isDead: false });
    const passive = trackedEnemy();
    const chasing = trackedEnemy('chase');
    manager.addEnemy(passive, 'chunk', 'blob/1');
    manager.addEnemy(chasing, 'chunk', 'blob/2');
    manager.deleteEnemyChunk('chunk');
    manager.updateEnemies(100);
    assert.equal(passive.disposals, 1);
    assert.equal(passive.updates, 0);
    assert.equal(chasing.disposals, 0);
    assert.equal(chasing.updates, 1);
    chasing.isDead = true;
    const replacement = trackedEnemy();
    manager.addEnemy(replacement, 'chunk', 'blob/2');
    assert.equal(replacement.isDead, true);
    manager.dispose();
});

function worldOptions() {
    const scheduled = [];
    const unloads = [];
    const created = [];
    const unloadedEnemies = [];
    const options = {
        layout: {
            getChunk: x => `${x}/0`, getChunksToLoad: chunk => [chunk], isInWorldBounds: () => true,
            getZoneForChunk: () => null, getSpawnNumber: () => 1,
            getRandomPositionInChunk: () => ({ x: 100, y: 100 }), isTooCloseToPlayerSpawn: () => false,
        },
        presentation: { initialize() {}, loadChunk() {}, unloadChunk: (chunk, complete, shouldUnload) => unloads.push({ chunk, complete, shouldUnload }) },
        schedule: callback => scheduled.push(callback),
        createEnemy: () => {
            const enemy = trackedEnemy();
            created.push(enemy);
            return enemy;
        },
        isSpaceAvailable: () => true,
        addEnemy() {},
        unloadEnemies: chunk => unloadedEnemies.push(chunk),
    };
    const flush = () => scheduled.splice(0).forEach(callback => callback());
    return { options, flush, unloads, created, unloadedEnemies };
}

test('world cancels an obsolete chunk unload and ignores scheduled spawning after disposal', () => {
    const fake = worldOptions();
    const world = new World(fake.options);
    world.update({ x: 0, y: 0, z: 0 });
    fake.flush();
    assert.equal(fake.created.length, 1);
    world.update({ x: 500, y: 0, z: 0 });
    fake.flush();
    assert.equal(fake.unloads.length, 1);
    world.update({ x: 0, y: 0, z: 0 });
    assert.equal(fake.unloads[0].shouldUnload(), false);
    assert.equal(fake.unloadedEnemies.length, 0);
    world.dispose();
    fake.flush();
    assert.equal(fake.created.length, 2);
});

test('world stops searching when a chunk has no valid enemy spawn position', () => {
    const fake = worldOptions();
    fake.options.isSpaceAvailable = () => false;
    const world = new World(fake.options);
    world.update({ x: 0, y: 0, z: 0 });
    fake.flush();
    assert.equal(fake.created.length, 200);
    assert.ok(fake.created.every(enemy => enemy.disposals === 1));
    world.dispose();
});

test('a complete gameplay session uses grouped dependencies and releases its entities', () => {
    const scheduled = [];
    const body = createBody();
    let projectileDisposals = 0;
    const game = new Game({
        clock: {
            currentTime: 1000,
            now() {
                return this.currentTime;
            },
        },
        scheduler: {
            callbacks: scheduled,
            schedule(callback) {
                this.callbacks.push(callback);
            },
        },
        bodies: {
            playerBody: body,
            createPlayer(position) {
                this.playerBody.position = { ...position };
                return this.playerBody;
            },
            createEnemy: () => createBody('enemy'),
            createProjectile() {
                return { position: this.playerBody.position, obstacleDistance: Infinity, setPosition() {}, showImpact() {}, dispose: () => projectileDisposals++ };
            },
        },
        physics: { isEnemySpaceAvailable: () => true },
        world: { initialize() {}, loadChunk() {}, unloadChunk() {} },
    });
    const frame = game.update({ forwardPressed: true, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: true }, 100);
    assert.equal(frame.isMoving, true);
    assert.equal(game.player.health, 100);
    game.dispose();
    scheduled.forEach(callback => callback());
    assert.equal(body.disposeCount, 1);
    assert.equal(projectileDisposals, 1);
});

test('game keeps enemy system callbacks bound when scheduled chunks load and unload', () => {
    const { Game: ScheduledGame } = loadTypeScript('../src/game/gameplay/game.ts', {
        './world/world-state': { WorldState: class {
            playerInitX = 0;
            playerInitY = 0;
        } },
        './world/world-layout': { WorldLayout: class {
            getChunk(x) { return `${x}/0`; }
            getChunksToLoad(chunk) { return [chunk]; }
            isInWorldBounds() { return true; }
            getZoneForChunk() { return null; }
            getSpawnNumber() { return 1; }
            getRandomPositionInChunk(x) { return { x: x + 1000, y: 1000 }; }
            isTooCloseToPlayerSpawn() { return false; }
        } },
    });
    const scheduled = [];
    const enemyBodies = [];
    const playerBody = createBody();
    const game = new ScheduledGame({
        clock: { now: () => 1000 },
        scheduler: { schedule: callback => scheduled.push(callback) },
        bodies: {
            createPlayer: () => playerBody,
            enemyBodies,
            createEnemy(name, type, position) {
                const body = createBody(name);
                body.position = { ...position };
                this.enemyBodies.push(body);
                return body;
            },
            createProjectile() {
                throw new Error('No projectile expected');
            },
        },
        physics: { isEnemySpaceAvailable: () => true },
        world: {
            initialize() {},
            loadChunk() {},
            unloadChunk: (chunk, onUnloaded) => onUnloaded(),
        },
    });
    try {
        scheduled.splice(0).forEach(callback => callback());
        assert.equal(enemyBodies.length, 1);
        assert.equal(enemyBodies[0].disposeCount, 0);
        playerBody.setPosition({ x: 500, y: 0, z: 0 });
        game.update({ forwardPressed: false, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: false }, 0);
        scheduled.splice(0).forEach(callback => callback());
        assert.equal(enemyBodies.length, 2);
        assert.equal(enemyBodies[0].disposeCount, 1);
        assert.equal(enemyBodies[1].disposeCount, 0);
    }
    finally {
        game.dispose();
    }
    assert.equal(enemyBodies[1].disposeCount, 1);
});
