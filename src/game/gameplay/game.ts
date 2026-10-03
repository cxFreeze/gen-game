import { Player, type PlayerCommands } from './player/player';
import { playerConfig } from './player/player-config';
import { EnemySystem } from './enemies/enemy-system';
import { ProjectileSystem } from './projectiles/projectile-system';
import { WorldState } from './world/world-state';
import { WorldLayout } from './world/world-layout';
import { World } from './world/world';
import type { GameView } from './game-view.interface';

export class Game {
    readonly player;
    private readonly enemies;
    private readonly projectiles;
    private readonly world;

    constructor(view: GameView) {
        const spawn = new WorldState();
        const layout = new WorldLayout(spawn);
        this.projectiles = new ProjectileSystem(view);
        const playerBody = view.createPlayer({ x: spawn.playerInitX, y: 0, z: spawn.playerInitY }, playerConfig.stats.range);
        this.player = new Player(playerBody, this.projectiles);
        this.enemies = new EnemySystem(this.player, this.projectiles, view);
        this.world = new World(layout, view, this.enemies);
        this.world.update(this.player.position, 0);
    }

    update(commands: PlayerCommands, deltaTime: number) {
        const frame = this.player.update(commands, deltaTime);
        this.projectiles.updatePositions(this.player, this.enemies);
        this.enemies.updateEnemies(deltaTime);
        this.world.update(this.player.position, deltaTime);
        return { playerPosition: this.player.position, isMoving: frame.isMoving };
    }

    dispose() {
        this.world.dispose();
        this.projectiles.dispose();
        this.enemies.dispose();
        this.player.dispose();
    }
}
