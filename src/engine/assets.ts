import { Assets } from "pixi.js";

export interface GGAsset {
    asset: any;
    height: number;
    width: number;
}

export abstract class AssetManager {
    static tree: GGAsset;
    static knight: GGAsset;

    static async loadAssets() {
        const treeAsset = await Assets.load('/tree.svg');

        this.tree = {
            asset: treeAsset,
            height: 250,
            width: 250,
        }

        console.log(this.tree);

        const knightAsset = await Assets.load('/knight.svg');

        this.knight = {
            asset: knightAsset,
            height: 100,
            width: 50,
        }

        console.log(this.knight);
    }
}



