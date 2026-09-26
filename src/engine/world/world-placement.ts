import type { GGAsset } from '../assets/gg-asset';
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
export function createWorldPlacement(options: WorldPlacementOptions) {
    const { randomNumber, randomBool, chunkSize, playerSpawn } = options;
    const randNumberItem = (itemType: string, x: number, y: number) => randomNumber(itemType + x + y);
    const randBoolItem = (probability: number, itemType: string, x: number, y: number) => randomBool(itemType + x + y, probability);
    const getChunk = (x: number, y: number) => getChunkKey(x, y, chunkSize);
    const initialPlayerChunk = getChunk(playerSpawn.x, playerSpawn.y);

    function getZoneRandomChunk(type: ZoneType, count: number): string {
        const x = randomNumber(`xzone${type}x${count}x${count}x${count}`);
        const y = randomNumber(`yzone${type}y${count}y${count}y${count}`);
        const worldX = x / 100 * options.worldSize - options.worldSize / 2;
        const worldY = y / 100 * options.worldSize - options.worldSize / 2;
        const chunk = getChunk(worldX, worldY);
        return chunk === initialPlayerChunk ? getZoneRandomChunk(type, count + 1500) : chunk;
    }

    return {
        getChunk,
        getBiomeChunk: (x: number, y: number) => getChunkKey(x, y, options.biomeChunkSize),
        getChunksToLoad: (chunk: string) => getNeighborChunks(chunk, chunkSize),
        getZoneRandomChunk,
        randBoolItem,
        randNumberItem,
        getDeviationX: (asset: GGAsset, x: number, y: number) =>
            2 * asset.safeZone * (randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio,
        getDeviationY: (asset: GGAsset, x: number, y: number) =>
            2 * asset.safeZone * (randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio,
        getDeviationZ: (asset: GGAsset, x: number, y: number, height: number) =>
            height * asset.maxVerticalDisplacement * randNumberItem(`${asset.name}deviationZ`, x, y) / 100,
        getSizeRatio(asset: GGAsset, x: number, y: number, useHugeFactor = true) {
            const deviation = asset.sizeRatio * (randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 50;
            const ratio = deviation < 0 ? 1 / (1 - deviation) : 1 + deviation;
            return useHugeFactor && randNumberItem(`${asset.name}huge`, x, y) < options.hugeSizeChance / 10
                ? ratio * options.hugeSizeRatio : ratio;
        },
        getSpawnNumber(spawnRate: number, name: string, x: number, y: number) {
            const threshold = Math.exp(-spawnRate);
            let count = 0;
            let probability = 1;
            do {
                count++;
                probability *= randomNumber(`spawn${count}${count}${count}${x}${y}${name}${count}${x}${count}${count}`) / 100;
            } while (probability > threshold);
            return count - 1;
        },
        getRandomPositionInChunk(chunkX: number, chunkY: number, name: string, count: number) {
            const xIndex = randomNumber(`x${count}x${chunkX}x${chunkY}${name}x${count}`) / 100 * chunkSize - chunkSize / 2;
            const yIndex = randomNumber(`y${count}y${chunkX}y${chunkY}${name}x${count}`) / 100 * chunkSize - chunkSize / 2;
            return { x: chunkX + xIndex, y: chunkY + yIndex };
        },
        isTooCloseToPlayerSpawn: (x: number, y: number) =>
            Math.sqrt(Math.pow(x - playerSpawn.x, 2) + Math.pow(y - playerSpawn.y, 2)) < playerSpawn.minDistance,
    };
}
