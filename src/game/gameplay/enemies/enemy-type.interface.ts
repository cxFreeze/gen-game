import type { EnemyAsset } from '../world/asset-types.interface';
import type { CharacterStats } from '../characters/character-stats.interface';

export interface EnemyType {
    name: EnemyAsset;
    maxSpawnDistance: number;
    detectionRange: number;
    stats: CharacterStats;
}
