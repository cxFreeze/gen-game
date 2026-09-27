import { Projectile } from './projectile';
import type { ProjectileBody } from './projectile-body.interface';
import type { ProjectileInfos } from './projectile-trajectory';

interface ProjectileSystemOptions {
    now: () => number;
    createBody: (id: string, infos: ProjectileInfos, owner: string) => ProjectileBody;
    checkHit: (projectile: Projectile) => boolean;
}

export class ProjectileSystem {
    private readonly options: ProjectileSystemOptions;
    private projectiles: Projectile[] = [];
    private count = 0;

    constructor(options: ProjectileSystemOptions) {
        this.options = options;
    }

    createProjectile(infos: ProjectileInfos, owner: string) {
        const id = `projectile-${++this.count}`;
        const projectile = new Projectile(id, infos, owner, this.options.createBody(id, infos, owner), this.options.now);
        this.projectiles.push(projectile);
        return projectile;
    }

    updatePositions() {
        for (const projectile of this.projectiles) {
            projectile.update(() => this.options.checkHit(projectile));
        }
        this.projectiles = this.projectiles.filter(projectile => !projectile.isDestroyed);
    }

    dispose() {
        this.projectiles.forEach(projectile => projectile.dispose());
        this.projectiles = [];
    }
}
