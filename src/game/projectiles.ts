import { AbstractMesh } from '@babylonjs/core';
import { Projectile, ProjectileInfos } from './projectile';


export class ProjectilesManager {

    private projectiles: Projectile[] = [];

    private static instance: ProjectilesManager;
    static getInstance(): ProjectilesManager {
        if (!this.instance) {
            this.instance = new ProjectilesManager();
        }
        return this.instance;
    }

    private constructor() {
    }

    createProjectile(projectileInfos: ProjectileInfos, origMesh: AbstractMesh) {
        const projectile = new Projectile(projectileInfos, origMesh);
        this.projectiles.push(projectile);
    }


    updatePositions() {
        this.projectiles.forEach(projectile => {
            if (projectile.isDestroyed) {
                const index = this.projectiles.indexOf(projectile);
                this.projectiles.splice(index, 1);
                return;
            }
            projectile.updatePosition();
        });
    }
}