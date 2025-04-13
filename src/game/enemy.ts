import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { App } from '../core/app';
import { CharacterStats } from '../models/interfaces';
import { GG3DAsset } from '../world/GGAsset';
import { Character } from './character';

export class Enemy extends Character {

    private lastPlayerPos: Vector3 | null = null;

    constructor(asset: GG3DAsset, position: Vector3, stats: CharacterStats) {
        super(asset, position, stats);
    }

    update(playerPos: Vector3, playerAlive: boolean) {
        if (this.isDead) {
            return;
        }

        this.lastPlayerPos = playerPos.clone();

        if (Vector3.Distance(this.position, playerPos) > 200) {
            return;
        }

        if (playerAlive) {
            this.tryFireProjectile();
        }

        const direction = playerPos.subtract(this.position).normalize();
        const rot = Math.atan2(direction.x, direction.z);
        this.rotate(rot);
    }

    override extraFireCondition(): boolean {
        if (!this.lastPlayerPos) {
            return false;
        }
        return this.canSeePlayer(this.lastPlayerPos);
    }

    canSeePlayer(playerPos: Vector3): boolean {
        const playerP = playerPos.clone();
        playerP.y = 3;

        const pos = this.position.clone();
        pos.y = 3;

        const direction = playerP.subtract(pos);
        const ray = new Ray(pos, direction.normalize(), this.range);

        const hit = App.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && !mesh.name.includes('projectile') && mesh.isPickable;
        });

        if (hit && hit.hit && hit.pickedMesh && hit.pickedMesh.name === 'player') {

            const forward = new Vector3(
                Math.sin(this.mesh.rotation.y),
                0,
                Math.cos(this.mesh.rotation.y)
            );

            const dotProduct = Vector3.Dot(forward, direction.normalize());
            return dotProduct > 0.98;
        }

        return false;
    }
}