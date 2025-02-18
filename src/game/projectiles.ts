import { AbstractMesh } from '@babylonjs/core';
import { Projectile } from './projectile';


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

    createProjectile(speed: number, direction: number, damage: number, origMesh: AbstractMesh) {
        const projectile = new Projectile(speed, direction, damage, origMesh);
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