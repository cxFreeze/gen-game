import { ZoneType } from './world-types';

const chunkSize = 500;
const worldSize = 16 * 2 * chunkSize;

/** Preserve the current world dimensions and development spawn settings. */
export const worldConfig = {
    chunkSize,
    biomeChunkSize: 2 * chunkSize,
    worldSize,
    safeDrawWorldSize: worldSize - chunkSize - 30,
    spawnNoDrawZone: 50,
    hugeSizeRatio: 3,
    hugeSizeChance: 5,
    zoneCount: { [ZoneType.town]: 2 },
    spawnMinDistanceFromPlayerSpawn: 200,
};
