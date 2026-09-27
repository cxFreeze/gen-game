import type { Position } from '../../math/position';
export interface ProjectileBody {
    readonly position: Position;
    readonly obstacleDistance: number;
    setPosition(position: Position): void;
    showImpact(): void;
    dispose(): void;
}
