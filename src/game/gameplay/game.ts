import { Player, type PlayerCommands } from './player/player';
import { playerConfig } from './player/player-config';
import { Enemy } from './enemies/enemy';
import { EnemySystem } from './enemies/enemy-system';
import { EnemyTypes } from './enemies/enemy-types';
import { ProjectileSystem } from './projectiles/projectile-system';
import { WorldState } from './world/world-state';
import { WorldLayout } from './world/world-layout';
import { World } from './world/world';
import type { GameDependencies } from './game-dependencies.interface';

export class Game {
    readonly player;
    private readonly enemies;
    private readonly projectiles;
    private enemyCount = 0;
    private readonly world;

    constructor(dependencies: GameDependencies) {
        const now = () => dependencies.clock.now();
        const spawn = new WorldState();
        const layout = new WorldLayout(spawn);
        this.player = new Player({
            body: dependencies.bodies.createPlayer({ x: spawn.playerInitX, y: 0, z: spawn.playerInitY }, playerConfig.stats.range),
            now,
            shoot: (infos, owner) => this.projectiles.createProjectile(infos, owner),
        });
        this.enemies = new EnemySystem(this.player);
        this.projectiles = new ProjectileSystem({
            now,
            createBody: (id, infos, owner) => dependencies.bodies.createProjectile(id, infos, owner),
            checkHit: projectile => this.player.checkDamageCollisions(projectile) || this.enemies.checkDamageCollisions(projectile),
        });
        this.world = new World({
            layout,
            presentation: dependencies.world,
            schedule: (callback, delay) => dependencies.scheduler.schedule(callback, delay),
            createEnemy: (type, position) => new Enemy({
                body: dependencies.bodies.createEnemy(`char-${type}${this.enemyCount++}`, type, position),
                enemyType: EnemyTypes[type],
                now,
                shoot: (infos, owner) => this.projectiles.createProjectile(infos, owner),
            }),
            isSpaceAvailable: enemy => dependencies.physics.isEnemySpaceAvailable(enemy.name, enemy.position),
            addEnemy: (enemy, chunk, slot) => this.enemies.addEnemy(enemy, chunk, slot),
            unloadEnemies: chunk => this.enemies.deleteEnemyChunk(chunk),
        });
        this.world.update(this.player.position);
    }

    update(commands: PlayerCommands, deltaTime: number) {
        const frame = this.player.update(commands, deltaTime);
        this.projectiles.updatePositions();
        this.enemies.updateEnemies(deltaTime);
        this.world.update(this.player.position);
        return { playerPosition: this.player.position, isMoving: frame.isMoving };
    }

    dispose() {
        this.world.dispose();
        this.projectiles.dispose();
        this.enemies.dispose();
        this.player.dispose();
    }
}
