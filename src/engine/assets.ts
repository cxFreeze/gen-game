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
        const treeAsset = await Assets.load({
            src: '/tree.svg', data: {
                parseAsGraphicsContext: true,
            }
        });

        this.tree = {
            asset: treeAsset,
            height: 200,
            width: 200,
        }

        const knightAsset = await Assets.load({
            src: '/knight.svg', data: {
                parseAsGraphicsContext: true,
            }
        });

        this.knight = {
            asset: knightAsset,
            height: 200,
            width: 100,
        }
    }
}



