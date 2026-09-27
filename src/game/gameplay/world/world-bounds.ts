export function isInWorldBounds(x: number, y: number, worldSize: number): boolean {
    const halfSize = worldSize / 2;
    return x < halfSize && x > -halfSize && y < halfSize && y > -halfSize;
}

export function isInChunkBounds(
    bounds: { minX: number, maxX: number, minY: number, maxY: number },
    chunkX: number, chunkY: number, chunkSize: number,
): boolean {
    const halfSize = chunkSize / 2;
    return bounds.minX > chunkX - halfSize && bounds.maxX < chunkX + halfSize
        && bounds.minY > chunkY - halfSize && bounds.maxY < chunkY + halfSize;
}
