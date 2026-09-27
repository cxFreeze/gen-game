import type { CharDirection } from '../characters/character-direction';

export interface MovementInput {
    readonly forwardPressed: boolean;
    readonly backwardsPressed: boolean;
    readonly leftPressed: boolean;
    readonly rightPressed: boolean;
}

export function getPlayerMovement(input: MovementInput, speed: number, deltaTime: number) {
    let x = Number(input.leftPressed) - Number(input.rightPressed);
    let z = Number(input.forwardPressed) - Number(input.backwardsPressed);
    if (x === 0 && z === 0) {
        return null;
    }
    const distance = speed * deltaTime / 1000 / (x !== 0 && z !== 0 ? Math.sqrt(2) : 1);
    x *= distance;
    z *= distance;
    let direction: CharDirection;
    if (x > 0 && z > 0) {
        direction = 'front-left';
    }
    else if (x < 0 && z > 0) {
        direction = 'front-right';
    }
    else if (x > 0 && z < 0) {
        direction = 'back-left';
    }
    else if (x < 0 && z < 0) {
        direction = 'back-right';
    }
    else if (z < 0) {
        direction = 'front';
    }
    else if (z > 0) {
        direction = 'back';
    }
    else {
        direction = x > 0 ? 'left' : 'right';
    }
    return { x, z, direction };
}
