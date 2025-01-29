import { GroundMesh } from '@babylonjs/core/Meshes/groundMesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { GG3DAsset, GGAsset, GGSpriteAsset } from '../world/GGAsset';

export enum BiomeType { forest = 1 };
export enum ZoneType { town = 1 };

export type BiomeAssetType = 'ground' | 'tree' | 'rock' | 'grass';
export type ZoneAssetType = 'ground' | 'plazaGround' | 'house' | 'center';
export type WorldAsset = 'player' | 'fence' | 'ocean';

export interface Biome {
    ground: BiomeAssetType;
    items: BiomeItem[];
}

export interface Zone {
    ground: BiomeAssetType;
    items: ZoneItem[];
}

export interface BiomeItem { asset: BiomeAssetType, drawCount: number, boostDrawCount?: number, boostDrawCountRate?: number };
export interface ZoneItem {
    asset: ZoneAssetType, drawCount: number, chunkPlacement?: { x: number, y: number, z: number };
};

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

