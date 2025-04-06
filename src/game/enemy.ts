import { Vector3 } from '@babylonjs/core';
import { CharacterStats } from '../models/interfaces';
import { GG3DAsset } from '../world/GGAsset';
import { Character } from './character';

export class Enemy extends Character {
    constructor(asset: GG3DAsset, position: Vector3, stats: CharacterStats) {
        super(asset, position, stats);
    }

    update(playerPos: Vector3, playerAlive: boolean) {
        if (this.isDead) {
            return;
        }

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
}