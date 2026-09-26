import { Ray } from '@babylonjs/core/Culling/ray.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { GameRuntime } from '../runtime/game-runtime';
import type { EnemyType } from './enemy-type';
import { Random } from '../utils/random';
import { GG3DAsset } from '../assets/gg-asset';
import { Character } from '../characters/character';
import { EnemyMovement, EnemyMovementMode } from './enemy-movement';

export class Enemy extends Character {
    private static readonly combatUpdateInterval = 150;
    private static readonly minimumAimDotProduct = 0.95;

    private lastPlayerPos: Vector3 | null = null;
    private hasClearShot = false;
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
        this.combatElapsedTime += deltaTime;

        const shouldUpdateCombat = this.combatElapsedTime >= Enemy.combatUpdateInterval;
        const isPlayerInRange = Vector3.Distance(this.position, playerPos) <= this.range;
        if (shouldUpdateCombat) {
            this.combatElapsedTime = 0;
            this.hasClearShot = playerAlive && isPlayerInRange && this.hasLineOfSight(playerPos);
        }

        this.movement.update(playerPos, playerAlive, this.hasClearShot, deltaTime);

        if (!shouldUpdateCombat || !isPlayerInRange) {
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
        return this.hasClearShot && this.isAimedAtPlayer(this.lastPlayerPos);
    }

    private hasLineOfSight(playerPos: Vector3): boolean {
        const playerP = playerPos.clone();
        playerP.y = 3;

        const pos = this.position.clone();
        pos.y = 3;

        const direction = playerP.subtract(pos);
        const ray = new Ray(pos, direction.normalize(), this.range);

        const hit = GameRuntime.scene.pickWithRay(ray, (mesh) => {
            return mesh !== this.mesh && !mesh.name.includes('projectile') && mesh.isPickable;
        });

        return !!(hit?.hit && hit.pickedMesh?.name === 'player');
    }

    private isAimedAtPlayer(playerPos: Vector3): boolean {
        const direction = playerPos.subtract(this.position);
        direction.y = 0;
        if (direction.lengthSquared() === 0) {
            return true;
        }

        const forward = new Vector3(
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        );
        return Vector3.Dot(forward, direction.normalize()) > Enemy.minimumAimDotProduct;
    }
}