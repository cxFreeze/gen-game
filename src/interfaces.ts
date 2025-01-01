import { GroundMesh, InstancedMesh, Material, Mesh, Sprite, SpriteManager } from '@babylonjs/core';

export enum BiomeType { forest = 1 };

export type AssetType = 'ground' | 'tree' | 'rock' | 'grass';

export interface GGA3DAsset {
    mesh?: Mesh;
    sprite?: SpriteManager;
    material?: Material;
    height: number;
    width: number;
    name: string;
    scale: number;
    safeZone: number;
    displacementRatio: number;
    sizeRatio: number;
    type: 'ground' | 'item' | 'sprite' | 'player';
    ignoreCollisions?: boolean;
    maxVerticalDisplacement?: number;
}

export interface Biome {
    ground: AssetType;
    items: BiomeItem[];
}

export interface BiomeItem { asset: AssetType, drawCount: number, boostDrawCount?: number, boostDrawCountRate?: number };

export interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GGA3DAsset;
}

export interface LoadedSprite {
    sprite: Sprite;
    asset: GGA3DAsset;
}

