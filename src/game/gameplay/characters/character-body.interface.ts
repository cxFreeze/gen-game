import type { Position } from '../../math/position';
/** Physical operations implemented by the rendering adapter. No game rules live here. */
export interface CharacterBody {
    readonly name: string;
    readonly position: Position;
    rotation: number;
    translate(x: number, z: number): void;
    setPosition(position: Position): void;
    rotate(rotation: number): void;
    intersectsProjectile(id: string): boolean;
    hasLineOfSight(target: Position, range: number): boolean;
    showDamage(previousHealth: number, currentHealth: number, maxHealth: number): void;
    /** Presents death and releases the body when its visual transition finishes. */
    showDeath(): void;
    dispose(): void;
}
export interface PlayerBody extends CharacterBody {
    present(state: {
        hasMoved: boolean;
        isMoving: boolean;
        movementSpeed: number;
        aimDirection: number;
        isFiring: boolean;
    }): void;
}
