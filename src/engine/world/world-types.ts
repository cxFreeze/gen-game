import type { Biome3DAssetType, BiomeAssetType, EnemyAsset, ZoneAssetType } from '../assets/asset-types';

export enum BiomeType { forest = 1 }
export enum ZoneType { town = 1 }

export interface Biome {
    ground: Biome3DAssetType;
    items: BiomeItem[];
    enemySpawns?: EnemySpawn[];
}

export interface Zone {
    ground: ZoneAssetType;
    items: ZoneItem[];
    enemySpawns?: EnemySpawn[];
}

export interface BiomeItem {
    asset: BiomeAssetType;
    drawCount: number;
    boostDrawCount?: number;
    boostDrawCountRate?: number;
}

export interface ZoneItem {
    asset: ZoneAssetType;
    drawCount: number;
    chunkPlacement?: { x: number, y: number, z: number };
}

export interface EnemySpawn {
    enemy: EnemyAsset;
    spawnRate: number;
}
