import { Assets } from "pixi.js";

export enum AssetLevel { groundTexture = 0, ground = 1, player = 2, sky = 3 };
export enum AssetZIndex { groundTexture = -200000, ground = -100000, sky = 100000 };

export interface GGAsset {
    asset: any;
    height: number;
    width: number;
    name: string;
    safeZone: number;
    smallItemSafeZone: number;
    level: AssetLevel;
    displacementRatio: number;
    sizeRatio: number;
}

export abstract class AssetManager {
    static knight: Partial<GGAsset>;
    static tree: GGAsset;
    static ground: GGAsset;;
    static grass: GGAsset;
    static rock: GGAsset;

    static async loadAssets() {

        const groundAsset = await Assets.load('/ground_texture.png');
        this.ground = {
            name: 'ground',
            asset: groundAsset,
            height: 500,
            width: 500,
            safeZone: 200,
            smallItemSafeZone: 0,
            displacementRatio: 0,
            sizeRatio: 0,
            level: AssetLevel.groundTexture
        }

        const treeAsset = await Assets.load('/tree.png');
        this.tree = {
            name: 'tree',
            asset: treeAsset,
            height: 280,
            width: 250,
            safeZone: 250,
            smallItemSafeZone: 0,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            level: AssetLevel.player
        }

        const knightAsset = await Assets.load('/knight.svg');
        this.knight = {
            name: 'knight',
            asset: knightAsset,
            height: 100,
            displacementRatio: 0.4,
            sizeRatio: 0.5,
            width: 50,
        }

        const grassAsset = await Assets.load('/grass.png');
        this.grass = {
            name: 'grass',
            asset: grassAsset,
            height: 40,
            width: 40,
            safeZone: 50,
            smallItemSafeZone: 0,
            displacementRatio: 0,
            sizeRatio: 0.5,
            level: AssetLevel.ground
        }

        const rockAsset = await Assets.load('/rock.png');
        this.rock = {
            name: 'rock',
            asset: rockAsset,
            height: 50,
            width: 50,
            safeZone: 100,
            smallItemSafeZone: 0,
            displacementRatio: 0.2,
            sizeRatio: 0.5,
            level: AssetLevel.player
        }
    }
}



