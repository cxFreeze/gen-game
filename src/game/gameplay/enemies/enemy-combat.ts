import { distanceBetween, type Position } from '../../math/position';

export class EnemyCombat {
    private readonly range: number;
    private target: Position | null = null;
    private hasClearShot = false;
    private elapsedTime = 150;

    constructor(range: number) {
        this.range = range;
    }

    prepare(position: Position, playerPosition: Position, playerAlive: boolean, deltaTime: number, hasLineOfSight: () => boolean) {
        this.target = { x: playerPosition.x, y: playerPosition.y, z: playerPosition.z };
        this.elapsedTime += deltaTime;
        const shouldUpdate = this.elapsedTime >= 150;
        const isPlayerInRange = distanceBetween(position, playerPosition) <= this.range;
        if (shouldUpdate) {
            this.elapsedTime = 0;
            this.hasClearShot = playerAlive && isPlayerInRange && hasLineOfSight();
        }
        return { hasClearShot: this.hasClearShot, shouldAttemptFire: shouldUpdate && isPlayerInRange && playerAlive };
    }

    canFire(position: Position, rotation: number): boolean {
        if (!this.hasClearShot || !this.target) {
            return false;
        }
        const x = this.target.x - position.x;
        const z = this.target.z - position.z;
        const distance = Math.hypot(x, z);
        return distance === 0 || (Math.sin(rotation) * x + Math.cos(rotation) * z) / distance > 0.95;
    }
}
