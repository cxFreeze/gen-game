import type { BodyFactory } from './body-factory.interface';
import type { GamePhysics } from './game-physics.interface';
import type { WorldPresentation } from './world/world';

export interface GameClock {
    now(): number;
}

export interface GameScheduler {
    schedule(callback: () => void, milliseconds: number): void;
}

export interface GameDependencies {
    clock: GameClock;
    scheduler: GameScheduler;
    bodies: BodyFactory;
    physics: GamePhysics;
    world: WorldPresentation;
}
