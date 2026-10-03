import type { EnemyType } from './enemy-type.interface';
import { distanceBetween, distanceSquared, type Position } from '../../math/position';
import { Random } from '../../math/random';
import type { Character } from '../characters/character';

export type EnemyMovementMode = 'passive' | 'chase' | 'attack';

export class EnemyMovement {
    private readonly body: Character;
    private readonly spawnPosition;
    private readonly maxSpawnDistance;
    private readonly attackDistance;
    private readonly detectionDistance;
    private readonly speed;
    private currentMode: EnemyMovementMode = 'passive';
    private passiveTarget: Position | null = null;
    private passivePauseRemaining = 0;
    private targetCount = 0;
    private blockedTime = 0;
    private avoidanceTime = 0;
    private avoidanceSide;

    constructor(body: Character, spawn: Position, enemyType: EnemyType) {
        this.body = body;
        this.spawnPosition = { x: spawn.x, y: spawn.y, z: spawn.z };
        this.maxSpawnDistance = Math.max(0, enemyType.maxSpawnDistance);
        this.attackDistance = Math.max(0, enemyType.stats.range);
        this.detectionDistance = Math.max(this.attackDistance, enemyType.detectionRange);
        this.speed = Math.max(0, enemyType.stats.speed) * 30;
        this.avoidanceSide = Random.randomBool(`${body.name}-avoidance`, 0.5) ? 1 : -1;
    }

    private getRandomValue(key: string, min: number, max: number): number {
        return min + (max - min) * Random.randomNumber(`${this.body.name}-${key}-${this.targetCount}`) / 100;
    }

    private getPassiveTarget(deltaTime: number): Position | null {
        if (distanceSquared(this.body.position, this.spawnPosition) > this.maxSpawnDistance ** 2) {
            return this.spawnPosition;
        }
        if (this.passivePauseRemaining > 0) {
            this.passivePauseRemaining = Math.max(0, this.passivePauseRemaining - deltaTime);
            return null;
        }
        if (!this.passiveTarget) {
            this.targetCount++;
            const angle = this.getRandomValue('angle', 0, Math.PI * 2);
            const radius = this.maxSpawnDistance * Math.sqrt(this.getRandomValue('radius', 0.2, 0.9));
            this.passiveTarget = {
                x: this.spawnPosition.x + Math.sin(angle) * radius,
                y: this.spawnPosition.y,
                z: this.spawnPosition.z + Math.cos(angle) * radius,
            };
        }
        return this.passiveTarget;
    }

    private turnTowards(x: number, z: number, elapsedSeconds: number): number {
        if (x === 0 && z === 0) {
            return 0;
        }
        const rotation = Math.atan2(x, z);
        const difference = Math.atan2(Math.sin(rotation - this.body.rotation), Math.cos(rotation - this.body.rotation));
        const maxRotation = Math.PI * 1.5 * elapsedSeconds;
        this.body.rotation += Math.max(-maxRotation, Math.min(maxRotation, difference));
        return difference;
    }

    private updateAvoidance(movedDistance: number, requestedDistance: number, deltaTime: number, targetRotation: number) {
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
        if (this.currentMode === 'passive' && Math.abs(targetRotation - this.body.rotation) < 0.1) {
            this.passiveTarget = null;
        }
    }

    update(playerPosition: Position, playerAlive: boolean, hasClearShot: boolean, deltaTime: number) {
        const elapsedSeconds = Math.min(deltaTime, 100) / 1000;
        const playerDistance = distanceBetween(this.body.position, playerPosition);
        const nextMode = playerAlive && playerDistance <= this.attackDistance ? 'attack'
            : playerAlive && playerDistance <= this.detectionDistance ? 'chase' : 'passive';
        if (nextMode !== this.currentMode) {
            this.currentMode = nextMode;
            this.passiveTarget = null;
            this.passivePauseRemaining = 0;
            this.blockedTime = 0;
            this.avoidanceTime = 0;
        }
        if (this.currentMode === 'attack' && hasClearShot) {
            this.avoidanceTime = 0;
            this.turnTowards(playerPosition.x - this.body.position.x, playerPosition.z - this.body.position.z, elapsedSeconds);
            return;
        }
        const target = this.currentMode === 'passive' ? this.getPassiveTarget(deltaTime) : playerPosition;
        if (!target) {
            return;
        }
        let x = target.x - this.body.position.x;
        let z = target.z - this.body.position.z;
        const targetDistance = Math.hypot(x, z);
        if (targetDistance <= 3) {
            if (this.currentMode === 'passive') {
                this.passiveTarget = null;
                this.passivePauseRemaining = this.getRandomValue('pause', 500, 2000);
            }
            return;
        }
        x /= targetDistance;
        z /= targetDistance;
        const rotateDirection = () => {
            const angle = this.avoidanceSide * Math.PI / 3;
            const nextX = x * Math.cos(angle) - z * Math.sin(angle);
            z = x * Math.sin(angle) + z * Math.cos(angle);
            x = nextX;
        };
        if (this.currentMode === 'attack') {
            rotateDirection();
        }
        this.avoidanceTime = Math.max(0, this.avoidanceTime - deltaTime);
        if (this.avoidanceTime > 0) {
            rotateDirection();
        }
        const targetRotation = Math.atan2(x, z);
        const angleDifference = this.turnTowards(x, z, elapsedSeconds);
        const distance = Math.min(this.speed * elapsedSeconds * Math.max(0, Math.cos(angleDifference)), targetDistance);
        if (distance <= 0) {
            return;
        }
        const oldPosition = { x: this.body.position.x, y: this.body.position.y, z: this.body.position.z };
        this.body.moveBy(Math.sin(this.body.rotation) * distance, Math.cos(this.body.rotation) * distance, position => {
            const nextDistance = distanceSquared(position, this.spawnPosition);
            return this.currentMode !== 'passive' || nextDistance <= this.maxSpawnDistance ** 2
                || nextDistance < distanceSquared(oldPosition, this.spawnPosition);
        });
        this.updateAvoidance(distanceBetween(oldPosition, this.body.position), distance, deltaTime, targetRotation);
    }

    get mode() {
        return this.currentMode;
    }
}
