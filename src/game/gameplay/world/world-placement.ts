import type { PlacementAsset } from './placement-asset.interface';
import { getChunkKey, getNeighborChunks } from './chunk-coordinates';
import type { ZoneType } from './world-types';

interface WorldPlacementOptions {
    randomNumber: (seed: string) => number;
    randomBool: (seed: string, probability: number) => boolean;
    chunkSize: number;
    biomeChunkSize: number;
    worldSize: number;
    hugeSizeChance: number;
    hugeSizeRatio: number;
    playerSpawn: { x: number, y: number, minDistance: number };
}

/** Seeded world calculations; dependencies are supplied by the active session. */
export class WorldPlacement {
    private readonly options: WorldPlacementOptions;
    private readonly randomNumber;
    private readonly randomBool;
    private readonly chunkSize;
    private readonly playerSpawn;
    private readonly initialPlayerChunk;

    constructor(options: WorldPlacementOptions) {
        this.options = options;
        this.randomNumber = this.options.randomNumber;
        this.randomBool = this.options.randomBool;
        this.chunkSize = this.options.chunkSize;
        this.playerSpawn = this.options.playerSpawn;
        this.initialPlayerChunk = this.getChunk(this.playerSpawn.x, this.playerSpawn.y);
    }

    randNumberItem(itemType: string, x: number, y: number) {
        return this.randomNumber(itemType + x + y);
    }

    randBoolItem(probability: number, itemType: string, x: number, y: number) {
        return this.randomBool(itemType + x + y, probability);
    }

    getChunk(x: number, y: number) {
        return getChunkKey(x, y, this.chunkSize);
    }

    getZoneRandomChunk(type: ZoneType, count: number): string {
        const x = this.randomNumber(`xzone${type}x${count}x${count}x${count}`);
        const y = this.randomNumber(`yzone${type}y${count}y${count}y${count}`);
        const worldX = x / 100 * this.options.worldSize - this.options.worldSize / 2;
        const worldY = y / 100 * this.options.worldSize - this.options.worldSize / 2;
        const chunk = this.getChunk(worldX, worldY);
        return chunk === this.initialPlayerChunk ? this.getZoneRandomChunk(type, count + 1500) : chunk;
    }

    getBiomeChunk(x: number, y: number) {
        return getChunkKey(x, y, this.options.biomeChunkSize);
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
        return useHugeFactor && this.randNumberItem(`${asset.name}huge`, x, y) < this.options.hugeSizeChance / 10
            ? ratio * this.options.hugeSizeRatio : ratio;
    }

    getSpawnNumber(spawnRate: number, name: string, x: number, y: number) {
        const threshold = Math.exp(-spawnRate);
        let count = 0;
        let probability = 1;
        do {
            count++;
            probability *= this.randomNumber(`spawn${count}${count}${count}${x}${y}${name}${count}${x}${count}${count}`) / 100;
        } while (probability > threshold);
        return count - 1;
    }

    getRandomPositionInChunk(chunkX: number, chunkY: number, name: string, count: number) {
        const xIndex = this.randomNumber(`x${count}x${chunkX}x${chunkY}${name}x${count}`) / 100 * this.chunkSize - this.chunkSize / 2;
        const yIndex = this.randomNumber(`y${count}y${chunkX}y${chunkY}${name}x${count}`) / 100 * this.chunkSize - this.chunkSize / 2;
        return { x: chunkX + xIndex, y: chunkY + yIndex };
    }

    isTooCloseToPlayerSpawn(x: number, y: number) {
        return Math.sqrt(Math.pow(x - this.playerSpawn.x, 2) + Math.pow(y - this.playerSpawn.y, 2)) < this.playerSpawn.minDistance;
    }
}
