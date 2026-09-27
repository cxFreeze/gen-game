import type { Position } from '../math/position';

export interface GamePhysics {
    isEnemySpaceAvailable(name: string, position: Position): boolean;
}
