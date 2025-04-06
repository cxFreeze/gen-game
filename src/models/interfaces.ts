import { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { GG3DAsset, GGAsset, GGSpriteAsset } from '../world/GGAsset';

export enum BiomeType { forest = 1 };
export enum ZoneType { town = 1 };

export type BiomeAssetType = 'ground' | 'tree' | 'rock' | 'grass';
export type ZoneAssetType = 'ground' | 'plazaGround' | 'house' | 'center' | 'tower';
export type WorldAsset = 'player' | 'fence' | 'ocean';
export type EnemyAsset = 'blob' | 'goblin' | 'skeleton' | 'troll';

export interface Biome {
    ground: BiomeAssetType;
    items: BiomeItem[];
    enemySpawns?: EnemySpawn[];
}

export interface Zone {
    ground: BiomeAssetType;
    items: ZoneItem[];
    enemySpawns?: EnemySpawn[];
}

export interface BiomeItem { asset: BiomeAssetType, drawCount: number, boostDrawCount?: number, boostDrawCountRate?: number };
export interface ZoneItem {
    asset: ZoneAssetType, drawCount: number, chunkPlacement?: { x: number, y: number, z: number };
};
export interface EnemySpawn {
    enemy: EnemyAsset;
    spawnRate: number;
}

export interface PreLoadedItem {
    asset: GGAsset;
    x: number;
    y: number;
    z: number;
    sizeRatio: number;
    rotate: number;
}

export interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GG3DAsset;
}

export interface LoadedSprite {
    sprite: Sprite;
    asset: GGSpriteAsset;
}

export interface CharacterStats {
    health: number;
    damage: number;
    speed: number;
    fireRate: number;
    projectileSpeed: number;
    range: number;
}

export interface EnemyType {
    name: EnemyAsset;
    stats: CharacterStats;
}

