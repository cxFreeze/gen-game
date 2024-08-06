import { Assets, Graphics } from "pixi.js";


export interface GGAsset {
    asset: any;
    height: number;
    width: number;
}

export let tree: GGAsset;

export async function loadAssets() {
    const treeAsset = await Assets.load({
        src: '/tree.svg', data: {
            parseAsGraphicsContext: true,
        }
    });

    tree = {
        asset: treeAsset,
        height: 100,
        width: 100,
    }
}

