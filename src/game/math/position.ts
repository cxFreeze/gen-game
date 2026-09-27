export interface Position {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export function distanceSquared(a: Position, b: Position): number {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
}

export function distanceBetween(a: Position, b: Position): number {
    return Math.sqrt(distanceSquared(a, b));
}
