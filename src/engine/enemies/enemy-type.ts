import type { EnemyAsset } from '../assets/asset-types';
import type { CharacterStats } from '../characters/character-stats';

export interface EnemyType {
    name: EnemyAsset;
    maxSpawnDistance: number;
    detectionRange: number;
    stats: CharacterStats;
}
