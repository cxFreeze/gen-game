import type { PlacementAsset } from './placement-asset.interface';
import { getChunkKey, getNeighborChunks } from './chunk-coordinates';
import type { ZoneType } from './world-types';
import { Random } from '../../math/random';
import { worldConfig } from './world-config';

/** Seeded world calculations using the shared world configuration. */
export class WorldPlacement {
    private readonly chunkSize = worldConfig.chunkSize;
    private readonly initialPlayerChunk;

    constructor(private readonly playerSpawn: { x: number; y: number; minDistance: number }) {
        this.initialPlayerChunk = this.getChunk(this.playerSpawn.x, this.playerSpawn.y);
    }

    randNumberItem(itemType: string, x: number, y: number) {
        return Random.randomNumber(itemType + x + y);
    }

    randBoolItem(probability: number, itemType: string, x: number, y: number) {
        return Random.randomBool(itemType + x + y, probability);
    }

    getChunk(x: number, y: number) {
        return getChunkKey(x, y, this.chunkSize);
    }

    getZoneRandomChunk(type: ZoneType, count: number): string {
        const x = Random.randomNumber(`xzone${type}x${count}x${count}x${count}`);
        const y = Random.randomNumber(`yzone${type}y${count}y${count}y${count}`);
        const worldX = x / 100 * worldConfig.safeDrawWorldSize - worldConfig.safeDrawWorldSize / 2;
        const worldY = y / 100 * worldConfig.safeDrawWorldSize - worldConfig.safeDrawWorldSize / 2;
        const chunk = this.getChunk(worldX, worldY);
        return chunk === this.initialPlayerChunk ? this.getZoneRandomChunk(type, count + 1500) : chunk;
    }

    getBiomeChunk(x: number, y: number) {
        return getChunkKey(x, y, worldConfig.biomeChunkSize);
    }

    getChunksToLoad(chunk: string) {
        return getNeighborChunks(chunk, this.chunkSize);
    }

    getDeviationX(asset: PlacementAsset, x: number, y: number) {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    getDeviationY(asset: PlacementAsset, x: number, y: number) {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    getDeviationZ(asset: PlacementAsset, x: number, y: number, height: number) {
        return height * asset.maxVerticalDisplacement * this.randNumberItem(`${asset.name}deviationZ`, x, y) / 100;
    }

    getSizeRatio(asset: PlacementAsset, x: number, y: number, useHugeFactor = true) {
        const deviation = asset.sizeRatio * (this.randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 50;
        const ratio = deviation < 0 ? 1 / (1 - deviation) : 1 + deviation;
        return useHugeFactor && this.randNumberItem(`${asset.name}huge`, x, y) < worldConfig.hugeSizeChance / 10
            ? ratio * worldConfig.hugeSizeRatio : ratio;
    }

    getSpawnNumber(spawnRate: number, name: string, x: number, y: number) {
        const threshold = Math.exp(-spawnRate);
        let count = 0;
        let probability = 1;
        do {
            count++;
            probability *= Random.randomNumber(`spawn${count}${count}${count}${x}${y}${name}${count}${x}${count}${count}`) / 100;
        } while (probability > threshold);
        return count - 1;
    }

    getRandomPositionInChunk(chunkX: number, chunkY: number, name: string, count: number) {
        const xIndex = Random.randomNumber(`x${count}x${chunkX}x${chunkY}${name}x${count}`) / 100 * this.chunkSize - this.chunkSize / 2;
        const yIndex = Random.randomNumber(`y${count}y${chunkX}y${chunkY}${name}x${count}`) / 100 * this.chunkSize - this.chunkSize / 2;
        return { x: chunkX + xIndex, y: chunkY + yIndex };
    }

    isTooCloseToPlayerSpawn(x: number, y: number) {
        return Math.sqrt(Math.pow(x - this.playerSpawn.x, 2) + Math.pow(y - this.playerSpawn.y, 2)) < this.playerSpawn.minDistance;
    }
}
