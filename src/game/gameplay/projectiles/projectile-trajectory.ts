import type { Position } from '../../math/position';

export interface ProjectileInfos {
    speed: number;
    direction: number;
    damage: number;
    range: number;
    color?: string;
}

export class ProjectileTrajectory {
    private readonly speed: number;
    private readonly direction: number;
    private readonly initialPosition: Position;
    private readonly createdAt: number;
    private readonly distanceToTravel: number;

    constructor(infos: ProjectileInfos, origin: Position, createdAt: number, obstacleDistance: number) {
        this.speed = infos.speed;
        this.direction = infos.direction;
        this.initialPosition = { x: origin.x, y: origin.y, z: origin.z };
        this.createdAt = createdAt;
        this.distanceToTravel = Math.min(infos.range, obstacleDistance);
    }

    sample(now: number) {
        const distance = this.speed * 30 * (now - this.createdAt) / 1000;
        return {
            position: {
                x: this.initialPosition.x + Math.sin(this.direction) * distance,
                y: this.initialPosition.y,
                z: this.initialPosition.z + Math.cos(this.direction) * distance,
            },
            hasReachedLimit: distance > this.distanceToTravel,
        };
    }
}
