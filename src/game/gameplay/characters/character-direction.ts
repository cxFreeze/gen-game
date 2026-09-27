export type CharDirection = 'front' | 'back' | 'left' | 'right' | 'front-left' | 'front-right' | 'back-left' | 'back-right';

const directionRotations: Record<CharDirection, number> = {
    front: Math.PI,
    back: 0,
    left: Math.PI / 2,
    right: -Math.PI / 2,
    'front-left': Math.PI / 4,
    'front-right': -Math.PI / 4,
    'back-left': Math.PI * 3 / 4,
    'back-right': Math.PI * 5 / 4,
};

export function getDirectionRotation(direction: CharDirection): number {
    return directionRotations[direction];
}
