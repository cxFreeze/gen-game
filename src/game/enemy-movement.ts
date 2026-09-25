import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { EnemyType } from '../models/interfaces';
import { Random } from '../utils/random';
import type { Enemy } from './enemy';

export type EnemyMovementMode = 'passive' | 'chase' | 'attack';

export class EnemyMovement {
    private static readonly speedRatio = 30;
    private static readonly turnSpeed = Math.PI * 1.5;
    private static readonly arrivalDistance = 3;

    private readonly spawnPosition: Vector3;
    private readonly maxSpawnDistance: number;
    private readonly attackDistance: number;
    private readonly detectionDistance: number;
    private readonly speed: number;

    private _mode: EnemyMovementMode = 'passive';
    get mode(): EnemyMovementMode {
        return this._mode;
    }

    private passiveTarget: Vector3 | null = null;
    private passivePauseRemaining = 0;
    private targetCount = 0;
    private blockedTime = 0;
    private avoidanceTime = 0;
    private avoidanceSide: number;

    constructor(private readonly enemy: Enemy, spawnPosition: Vector3, enemyType: EnemyType) {
        this.spawnPosition = spawnPosition.clone();
        this.maxSpawnDistance = Math.max(0, enemyType.maxSpawnDistance);
        this.attackDistance = Math.max(0, enemyType.stats.range);
        this.detectionDistance = Math.max(this.attackDistance, enemyType.detectionRange);
        this.speed = Math.max(0, enemyType.stats.speed) * EnemyMovement.speedRatio;
        this.avoidanceSide = Random.randomBool(`${this.enemy.name}-avoidance`, 0.5) ? 1 : -1;
    }

    update(playerPosition: Vector3, playerAlive: boolean, deltaTime: number): void {
        const elapsedSeconds = Math.min(deltaTime, 100) / 1000;
        const playerDistance = Vector3.Distance(this.enemy.position, playerPosition);
        let nextMode: EnemyMovementMode = 'passive';
        if (playerAlive && playerDistance <= this.attackDistance) {
            nextMode = 'attack';
        }
        else if (playerAlive && playerDistance <= this.detectionDistance) {
            nextMode = 'chase';
        }

        this.changeMode(nextMode);

        if (this._mode === 'attack') {
            this.turnTowards(playerPosition.subtract(this.enemy.position), elapsedSeconds);
            return;
        }

        const target = this._mode === 'chase'
            ? playerPosition
            : this.getPassiveTarget(deltaTime);

        if (!target) {
            return;
        }

        const targetDirection = target.subtract(this.enemy.position);
        targetDirection.y = 0;
        const targetDistance = targetDirection.length();

        if (targetDistance <= EnemyMovement.arrivalDistance) {
            if (this._mode === 'passive') {
                this.passiveTarget = null;
                this.passivePauseRemaining = this.getRandomValue('pause', 500, 2000);
            }
            return;
        }

        targetDirection.normalize();
        this.avoidanceTime = Math.max(0, this.avoidanceTime - deltaTime);
        if (this.avoidanceTime > 0) {
            const avoidanceAngle = this.avoidanceSide * Math.PI / 3;
            const x = targetDirection.x * Math.cos(avoidanceAngle) - targetDirection.z * Math.sin(avoidanceAngle);
            const z = targetDirection.x * Math.sin(avoidanceAngle) + targetDirection.z * Math.cos(avoidanceAngle);
            targetDirection.set(x, 0, z);
        }

        const targetRotation = Math.atan2(targetDirection.x, targetDirection.z);
        const angleDifference = this.turnTowards(targetDirection, elapsedSeconds);
        const speedFactor = Math.max(0, Math.cos(angleDifference));
        const distance = Math.min(this.speed * elapsedSeconds * speedFactor, targetDistance);

        if (distance <= 0) {
            return;
        }

        const oldPosition = this.enemy.position.clone();
        this.enemy.moveBy(
            Math.sin(this.enemy.mesh.rotation.y) * distance,
            Math.cos(this.enemy.mesh.rotation.y) * distance,
            position => this.isPositionWithinPatrolArea(position, oldPosition)
        );

        const movedDistance = Vector3.Distance(oldPosition, this.enemy.position);
        this.updateAvoidance(movedDistance, distance, deltaTime, targetRotation);
    }

    private changeMode(mode: EnemyMovementMode): void {
        if (mode === this._mode) {
            return;
        }

        this._mode = mode;
        this.passiveTarget = null;
        this.passivePauseRemaining = 0;
        this.blockedTime = 0;
        this.avoidanceTime = 0;
    }

    private getPassiveTarget(deltaTime: number): Vector3 | null {
        if (Vector3.DistanceSquared(this.enemy.position, this.spawnPosition) > this.maxSpawnDistance * this.maxSpawnDistance) {
            return this.spawnPosition;
        }

        if (this.passivePauseRemaining > 0) {
            this.passivePauseRemaining = Math.max(0, this.passivePauseRemaining - deltaTime);
            return null;
        }

        if (this.passiveTarget) {
            return this.passiveTarget;
        }

        this.targetCount++;
        const angle = this.getRandomValue('angle', 0, Math.PI * 2);
        const radiusRatio = this.getRandomValue('radius', 0.2, 0.9);
        const radius = this.maxSpawnDistance * Math.sqrt(radiusRatio);

        this.passiveTarget = this.spawnPosition.add(new Vector3(
            Math.sin(angle) * radius,
            0,
            Math.cos(angle) * radius
        ));
        return this.passiveTarget;
    }

    private isPositionWithinPatrolArea(position: Vector3, previousPosition: Vector3): boolean {
        if (this._mode === 'chase') {
            return true;
        }

        const maxSpawnDistanceSquared = this.maxSpawnDistance * this.maxSpawnDistance;
        const nextDistanceSquared = Vector3.DistanceSquared(position, this.spawnPosition);
        return nextDistanceSquared <= maxSpawnDistanceSquared
            || nextDistanceSquared < Vector3.DistanceSquared(previousPosition, this.spawnPosition);
    }

    private turnTowards(direction: Vector3, elapsedSeconds: number): number {
        direction.y = 0;
        if (direction.lengthSquared() === 0) {
            return 0;
        }

        const targetRotation = Math.atan2(direction.x, direction.z);
        const difference = Math.atan2(
            Math.sin(targetRotation - this.enemy.mesh.rotation.y),
            Math.cos(targetRotation - this.enemy.mesh.rotation.y)
        );
        const maxRotation = EnemyMovement.turnSpeed * elapsedSeconds;
        this.enemy.mesh.rotation.y += Math.max(-maxRotation, Math.min(maxRotation, difference));
        return difference;
    }

    private updateAvoidance(movedDistance: number, requestedDistance: number, deltaTime: number, targetRotation: number): void {
        if (movedDistance >= requestedDistance * 0.2) {
            this.blockedTime = 0;
            return;
        }

        this.blockedTime += deltaTime;
        if (this.blockedTime < 150) {
            return;
        }

        this.blockedTime = 0;
        this.avoidanceTime = 900;
        this.avoidanceSide *= -1;

        if (this._mode === 'passive' && Math.abs(targetRotation - this.enemy.mesh.rotation.y) < 0.1) {
            this.passiveTarget = null;
        }
    }

    private getRandomValue(key: string, min: number, max: number): number {
        const ratio = Random.randomNumber(`${this.enemy.name}-${key}-${this.targetCount}`) / 100;
        return min + (max - min) * ratio;
    }
}