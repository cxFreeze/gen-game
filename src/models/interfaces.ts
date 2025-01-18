import { GroundMesh, InstancedMesh, Sprite } from '@babylonjs/core';
import { GG3DAsset, GGSpriteAsset } from '../world/GGAsset';

export enum BiomeType { forest = 1 };

export type BiomeAssetType = 'ground' | 'tree' | 'rock' | 'grass';
export type WorldAsset = 'player' | 'fence' | 'ocean';

export interface Biome {
    ground: BiomeAssetType;
    items: BiomeItem[];
}

export interface BiomeItem { asset: BiomeAssetType, drawCount: number, boostDrawCount?: number, boostDrawCountRate?: number };

export interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GG3DAsset;
}

export interface LoadedSprite {
    sprite: Sprite;
    asset: GGSpriteAsset;
}

