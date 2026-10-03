import { Projectile } from './projectile';
import type { ProjectileInfos } from './projectile-trajectory';
import type { GameView } from '../game-view.interface';
import type { Player } from '../player/player';
import type { EnemySystem } from '../enemies/enemy-system';

export class ProjectileSystem {
    private projectiles: Projectile[] = [];
    private count = 0;

    constructor(private readonly view: GameView) {}

    createProjectile(infos: ProjectileInfos, owner: string) {
        const id = `projectile-${++this.count}`;
        const body = this.view.createProjectile(id, infos, owner);
        const projectile = new Projectile(id, infos, owner, body);
        this.projectiles.push(projectile);
        return projectile;
    }

    updatePositions(player: Player, enemies: EnemySystem) {
        for (const projectile of this.projectiles) {
            projectile.update();
            if (!projectile.isDestroyed && (player.checkDamageCollisions(projectile) || enemies.checkDamageCollisions(projectile))) {
                projectile.destroy();
            }
        }
        this.projectiles = this.projectiles.filter(projectile => !projectile.isDestroyed);
    }

    dispose() {
        this.projectiles.forEach(projectile => projectile.dispose());
        this.projectiles = [];
    }
}
