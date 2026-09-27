import { isInWorldBounds } from '../world/world-bounds';
import { worldConfig } from '../world/world-config';
import { ProjectileTrajectory, type ProjectileInfos } from './projectile-trajectory';
import type { ProjectileBody } from './projectile-body.interface';
export class Projectile {
    readonly id: string;
    readonly ownerName: string;
    private readonly body: ProjectileBody;
    private readonly now: () => number;
    private readonly trajectory;
    private hasDestroyed = false;
    readonly damage;

    constructor(id: string, infos: ProjectileInfos, ownerName: string, body: ProjectileBody, now: () => number) {
        this.id = id;
        this.ownerName = ownerName;
        this.body = body;
        this.now = now;
        this.trajectory = new ProjectileTrajectory(infos, this.body.position, this.now(), this.body.obstacleDistance);
        this.damage = infos.damage;
    }

    private destroy() {
        if (!this.hasDestroyed) {
            this.hasDestroyed = true;
            this.body.showImpact();
            this.body.dispose();
        }
    }

    get isDestroyed() {
        return this.hasDestroyed;
    }

    update(checkHit: () => boolean) {
        if (this.hasDestroyed) {
            return;
        }
        const { position, hasReachedLimit } = this.trajectory.sample(this.now());
        this.body.setPosition(position);
        if (hasReachedLimit || !isInWorldBounds(position.x, position.z, worldConfig.safeDrawWorldSize) || checkHit()) {
            this.destroy();
        }
    }

    dispose() {
        if (!this.hasDestroyed) {
            this.hasDestroyed = true;
            this.body.dispose();
        }
    }
}
