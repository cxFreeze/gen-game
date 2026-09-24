import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { App } from '../core/app';
import { EnemyType } from '../models/interfaces';
import { Random } from '../utils/random';
import { GG3DAsset } from '../world/GGAsset';
import { Character } from './character';
import { EnemyMovement, EnemyMovementMode } from './enemy-movement';

export class Enemy extends Character {
    private static readonly combatUpdateInterval = 150;

    private lastPlayerPos: Vector3 | null = null;
    private combatElapsedTime = Enemy.combatUpdateInterval;
    private readonly movement: EnemyMovement;

    get movementMode(): EnemyMovementMode {
        return this.movement.mode;
    }

    constructor(asset: GG3DAsset, position: Vector3, enemyType: EnemyType) {
        super(asset, position, enemyType.stats);

        const rotationY = Random.randomNumber(`rotY--${this.position.y}--${this.name}--${this.position.x}`) / 100 * Math.PI * 2;
        this.mesh.rotation.y = rotationY;
        this.movement = new EnemyMovement(this, position, enemyType);
    }

    update(playerPos: Vector3, playerAlive: boolean, deltaTime: number) {
        if (this.isDead) {
            return;
        }

        this.lastPlayerPos = playerPos.clone();
        this.movement.update(playerPos, playerAlive, deltaTime);
        this.combatElapsedTime += deltaTime;

        if (this.combatElapsedTime < Enemy.combatUpdateInterval) {
            return;
        }
        this.combatElapsedTime = 0;

        if (Vector3.Distance(this.position, playerPos) > 200) {
            return;
        }

        if (playerAlive) {
            this.tryFireProjectile();
        }
    }

    protected override extraFireCondition(): boolean {
        if (!this.lastPlayerPos) {
            return false;
        }
        return this.canSeePlayer(this.lastPlayerPos);
    }

    private canSeePlayer(playerPos: Vector3): boolean {
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