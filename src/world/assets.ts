import { Assets, Texture } from "pixi.js";

export enum AssetLevel { groundTexture = 0, ground = 1, player = 2, sky = 3 };
export enum AssetZIndex { groundTexture = -200000, ground = -100000, sky = 100000 };

export interface GGAsset {
    texture: Texture;
    height: number;
    width: number;
    name: string;
    safeZone: number;
    groundSafeZone: number;
    level: AssetLevel;
    displacementRatio: number;
    sizeRatio: number;
}

export abstract class AssetManager {
    static knight: Partial<GGAsset>;
    static tree: GGAsset;
    static forestGround: GGAsset;;
    static grass: GGAsset;
    static rock: GGAsset;

    static async loadAssets() {
        const groundTxtr = await Assets.load('/ground_texture.png');
        this.forestGround = {
            name: 'ground',
            texture: groundTxtr,
            height: 500,
            width: 500,
            safeZone: 500,
            groundSafeZone: 500,
            displacementRatio: 0,
            sizeRatio: 0,
            level: AssetLevel.groundTexture
        }

        const treeTxtr = await Assets.load('/tree.png');
        this.tree = {
            name: 'tree',
            texture: treeTxtr,
            height: 280,
            width: 250,
            safeZone: 250,
            groundSafeZone: 150,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            level: AssetLevel.player
        }

        const knightTxtr = await Assets.load('/knight.svg');
        this.knight = {
            name: 'knight',
            texture: knightTxtr,
            height: 100,
            displacementRatio: 0.4,
            sizeRatio: 0.5,
            width: 50,
        }

        const grassAsset = await Assets.load('/grass.png');
        this.grass = {
            name: 'grass',
            texture: grassAsset,
            height: 40,
            width: 40,
            safeZone: 50,
            groundSafeZone: 50,
            displacementRatio: 0,
            sizeRatio: 0.5,
            level: AssetLevel.ground
        }

        const rockAsset = await Assets.load('/rock.png');
        this.rock = {
            name: 'rock',
            texture: rockAsset,
            height: 50,
            width: 50,
            safeZone: 75,
            groundSafeZone: 75,
            displacementRatio: 0.2,
            sizeRatio: 0.5,
            level: AssetLevel.ground
        }
    }
}



