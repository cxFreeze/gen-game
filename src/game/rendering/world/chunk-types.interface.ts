import type { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import type { GG3DAsset, GGSpriteAsset } from '../assets/gg-asset';

export interface PreLoadedItem {
    asset: GG3DAsset;
    x: number;
    y: number;
    z: number;
    sizeRatio: number;
    rotate: number;
}

export interface LoadedMesh {
    mesh: InstancedMesh;
    asset: GG3DAsset;
}

export interface LoadedSprite {
    sprite: Sprite;
    asset: GGSpriteAsset;
}
