export function getChunkKey(x: number, y: number, chunkSize: number) {
    const chunkX = Math.round(x / chunkSize) * chunkSize;
    const chunkY = Math.round(y / chunkSize) * chunkSize;
    return `${chunkX}/${chunkY}`;
}

export function getNeighborChunks(currentChunk: string, chunkSize: number) {
    const [chunkX, chunkY] = currentChunk.split('/').map(value => parseInt(value));
    const chunks: string[] = [];
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            chunks.push(`${chunkX + x * chunkSize}/${chunkY + y * chunkSize}`);
        }
    }
    return chunks;
}
