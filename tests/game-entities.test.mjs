import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTypeScript } from './load-typescript.mjs';

const { Character } = loadTypeScript('../src/game/gameplay/characters/character.ts', {}, { Date });
const { Player } = loadTypeScript('../src/game/gameplay/player/player.ts', {}, { Date });
const { Enemy } = loadTypeScript('../src/game/gameplay/enemies/enemy.ts', {}, { Date });
const { EnemySystem } = loadTypeScript('../src/game/gameplay/enemies/enemy-system.ts', {}, { Date });
const { ProjectileSystem } = loadTypeScript('../src/game/gameplay/projectiles/projectile-system.ts', {}, { Date });
const { World } = loadTypeScript('../src/game/gameplay/world/world.ts');
const { Game } = loadTypeScript('../src/game/gameplay/game.ts', {}, { Date });
const { playerConfig } = loadTypeScript('../src/game/gameplay/player/player-config.ts');

function createBody(name = 'player') {
    const body = {
        name,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        disposeCount: 0,
        deathCount: 0,
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
        showDeath() {
            body.deathCount++;
        },
        dispose() {
            body.disposeCount++;
        },
    };
    return body;
}

class RecordedProjectiles {
    shots = [];

    getTime() {
        return Date.now();
    }

    createProjectile(infos, owner) {
        this.shots.push({ infos, owner });
    }
}

class TestGameView {
    enemyBodies = [];
    projectileBodies = [];
    hasSpace = true;

    constructor(playerBody = createBody()) {
        this.playerBody = playerBody;
    }

    createPlayer(position) {
        this.playerBody.setPosition(position);
        return this.playerBody;
    }

    createEnemy(name, type, position) {
        const body = createBody(name);
        body.setPosition(position);
        this.enemyBodies.push(body);
        return body;
    }

    createProjectile() {
        const body = {
            position: { ...this.playerBody.position },
            obstacleDistance: Infinity,
            impacts: 0,
            disposals: 0,
            setPosition(position) {
                this.position = position;
            },
            showImpact() {
                this.impacts++;
            },
            dispose() {
                this.disposals++;
            },
        };
        this.projectileBodies.push(body);
        return body;
    }

    isEnemySpaceAvailable() {
        return this.hasSpace;
    }
    initializeWorld() {}
    loadChunk() {}
    unloadChunk(chunk, onUnloaded, shouldUnload) {
        if (shouldUnload()) {
            onUnloaded();
        }
    }
}

test('character slides along a collision and restores a position rejected by gameplay', () => {
    const body = createBody();
    body.translate = (x, z) => {
        if (x === 0 || z === 0) {
            body.position = { x: body.position.x + x, y: 0, z: body.position.z + z };
        }
    };
    const character = new Character(body, playerConfig.stats, new RecordedProjectiles());
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
    assert.equal(body.deathCount, 1);
    assert.equal(body.disposeCount, 0);
});

test('player owns movement, firing cooldowns, and immunity to its own projectiles', context => {
    let now = 1000;
    context.mock.method(Date, 'now', () => now);
    const body = createBody();
    const projectiles = new RecordedProjectiles();
    const { shots } = projectiles;
    const player = new Player(body, projectiles);
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
    assert.equal(body.deathCount, 1);
    assert.equal(body.disposeCount, 0);
});

test('enemy combines detection, aim, line of sight, and firing in gameplay', context => {
    context.mock.method(Date, 'now', () => 1000);
    const body = createBody('enemy');
    const projectiles = new RecordedProjectiles();
    const { shots } = projectiles;
    const enemy = new Enemy(body,
        { name: 'blob', detectionRange: 200, maxSpawnDistance: 500, stats: { ...playerConfig.stats, range: 100 } },
        projectiles);
    enemy.rotation = 0;
    enemy.update({ position: { x: 0, y: 0, z: 50 }, isDead: false }, 150);
    assert.equal(enemy.getMovementMode(), 'attack');
    assert.equal(shots.length, 1);
    body.hasLineOfSight = () => false;
    enemy.update({ position: { x: 0, y: 0, z: 50 }, isDead: false }, 150);
    assert.equal(shots.length, 1);
});

test('death is presented once while ordinary disposal skips the death transition', () => {
    const projectiles = new RecordedProjectiles();
    for (const shouldTakeDamage of [false, true]) {
        const body = createBody('enemy');
        const character = new Character(body, playerConfig.stats, projectiles);
        if (shouldTakeDamage) {
            character.takeDamage(character.maxHealth);
        }
        else {
            character.die();
        }
        character.die();
        character.takeDamage(1);
        character.dispose();
        character.moveBy(10, 10);
        assert.equal(character.isDead, true);
        assert.equal(character.isDisposed, true);
        assert.equal(character.tryFire(), false);
        assert.equal(body.deathCount, 1);
        assert.equal(body.disposeCount, 0);
        assert.deepEqual(body.position, { x: 0, y: 0, z: 0 });
    }
    const body = createBody();
    const character = new Character(body, playerConfig.stats, projectiles);
    character.dispose();
    character.dispose();
    assert.equal(body.disposeCount, 1);
    assert.equal(body.deathCount, 0);
});

test('reloading a chunk does not create a model or replay death for a defeated enemy', () => {
    const view = new TestGameView();
    const manager = new EnemySystem({ position: { x: 0, y: 0, z: 0 }, isDead: false }, new RecordedProjectiles(), view);
    manager.spawnEnemy('blob', { x: 0, y: 0, z: 0 }, 'chunk', 'blob/1');
    assert.equal(view.enemyBodies.length, 1);
    manager.checkDamageCollisions({ id: 'projectile', ownerName: 'player', damage: 10000 });
    assert.equal(view.enemyBodies[0].deathCount, 1);
    manager.deleteEnemyChunk('chunk');
    assert.equal(manager.spawnEnemy('blob', { x: 0, y: 0, z: 0 }, 'chunk', 'blob/1'), true);
    assert.equal(view.enemyBodies.length, 1);
    assert.equal(view.enemyBodies[0].deathCount, 1);
    manager.dispose();
});

test('projectile system updates adjacent expired projectiles and never skips one', context => {
    let now = 1000;
    context.mock.method(Date, 'now', () => now);
    const view = new TestGameView();
    const manager = new ProjectileSystem(view);
    const infos = { speed: 1, direction: 0, damage: 1, range: 1 };
    const first = manager.createProjectile(infos, 'enemy');
    const second = manager.createProjectile(infos, 'enemy');
    now = 1100;
    const noHit = { checkDamageCollisions: () => false };
    manager.updatePositions(noHit, noHit);
    assert.equal(first.isDestroyed, true);
    assert.equal(second.isDestroyed, true);
    assert.equal(view.projectileBodies.reduce((total, body) => total + body.impacts, 0), 2);
    manager.dispose();
    assert.equal(view.projectileBodies.reduce((total, body) => total + body.disposals, 0), 2);
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
    const manager = new EnemySystem({ position: { x: 0, y: 0, z: 0 }, isDead: false }, new RecordedProjectiles(), new TestGameView());
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

function createWorldContext() {
    const unloads = [];
    const layout = {
        getChunk: x => `${x}/0`, getChunksToLoad: chunk => [chunk], isInWorldBounds: () => true,
        getZoneForChunk: () => null, getSpawnNumber: () => 1,
        getRandomPositionInChunk: () => ({ x: 100, y: 100 }), isTooCloseToPlayerSpawn: () => false,
    };
    const view = new TestGameView();
    view.unloadChunk = (chunk, complete, shouldUnload) => unloads.push({ chunk, complete, shouldUnload });
    const enemies = new EnemySystem({ position: { x: 0, y: 0, z: 0 }, isDead: false }, new RecordedProjectiles(), view);
    return { layout, view, enemies, unloads, created: view.enemyBodies };
}

test('world cancels an obsolete chunk unload and discards pending spawning after disposal', () => {
    const fake = createWorldContext();
    const world = new World(fake.layout, fake.view, fake.enemies);
    world.update({ x: 0, y: 0, z: 0 }, 0);
    assert.equal(fake.created.length, 1);
    world.update({ x: 500, y: 0, z: 0 }, 100);
    assert.equal(fake.unloads.length, 1);
    world.update({ x: 0, y: 0, z: 0 }, 0);
    assert.equal(fake.unloads[0].shouldUnload(), false);
    assert.equal(fake.created[0].disposeCount, 0);
    world.update({ x: 1000, y: 0, z: 0 }, 0);
    world.dispose();
    world.update({ x: 1000, y: 0, z: 0 }, 1000);
    assert.equal(fake.created.length, 2);
    assert.equal(fake.unloads[0].shouldUnload(), false);
    fake.enemies.dispose();
});

test('world stops searching when a chunk has no valid enemy spawn position', () => {
    const fake = createWorldContext();
    fake.view.hasSpace = false;
    const world = new World(fake.layout, fake.view, fake.enemies);
    world.update({ x: 0, y: 0, z: 0 }, 0);
    assert.equal(fake.created.length, 200);
    assert.ok(fake.created.every(body => body.disposeCount === 1));
    world.dispose();
    fake.enemies.dispose();
});

test('a complete gameplay session calls its view and releases its entities', context => {
    context.mock.method(Date, 'now', () => 1000);
    const body = createBody();
    const view = new TestGameView(body);
    const game = new Game(view);
    const frame = game.update({ forwardPressed: true, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: true }, 100);
    assert.equal(frame.isMoving, true);
    assert.equal(game.player.health, 100);
    game.dispose();
    assert.equal(body.disposeCount, 1);
    assert.equal(view.projectileBodies.length, 1);
    assert.equal(view.projectileBodies[0].disposals, 1);
    assert.ok(view.enemyBodies.every(enemyBody => enemyBody.disposeCount === 1));
});

test('gameplay projectiles and firing cooldowns advance only with simulated game time', context => {
    let now = 1000;
    context.mock.method(Date, 'now', () => now);
    const view = new TestGameView();
    const game = new Game(view);
    context.after(() => game.dispose());
    for (const body of view.enemyBodies) {
        body.intersectsProjectile = () => false;
    }
    const commands = { forwardPressed: false, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: true };
    game.update(commands, 16);
    assert.equal(view.projectileBodies.length, 1);
    const projectileBody = view.projectileBodies[0];
    const origin = { ...projectileBody.position };

    now += 60000;
    game.update(commands, 16);
    assert.equal(view.projectileBodies.length, 1, 'A pause must not finish the firing cooldown');
    assert.equal(projectileBody.disposals, 0, 'A projectile must not expire during a pause');
    const expectedDistance = playerConfig.stats.projectileSpeed * 30 * 16 / 1000;
    assert.ok(Math.abs(projectileBody.position.z - origin.z - expectedDistance) < 1e-8);

    game.update(commands, 500);
    assert.equal(view.projectileBodies.length, 2, 'Firing resumes when the game-time cooldown elapses');
});

test('game creates and disposes enemies as its world loads and unloads chunks', () => {
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
    const playerBody = createBody();
    const view = new TestGameView(playerBody);
    const { enemyBodies } = view;
    const game = new ScheduledGame(view);
    try {
        assert.equal(enemyBodies.length, 1);
        assert.equal(enemyBodies[0].disposeCount, 0);
        playerBody.setPosition({ x: 500, y: 0, z: 0 });
        game.update({ forwardPressed: false, backwardsPressed: false, leftPressed: false, rightPressed: false, aimDirection: 0, isFiring: false }, 100);
        assert.equal(enemyBodies.length, 2);
        assert.equal(enemyBodies[0].disposeCount, 1);
        assert.equal(enemyBodies[1].disposeCount, 0);
    }
    finally {
        game.dispose();
    }
    assert.equal(enemyBodies[1].disposeCount, 1);
});
