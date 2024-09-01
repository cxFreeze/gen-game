import { Assets, Texture } from "pixi.js";
import { Random } from "../../utils/random.js";

export enum AssetLevel { groundTexture = 0, ground = 1, player = 2, large = 3, sky = 4 };
export enum AssetZIndex { groundTexture = -200000, ground = -100000, sky = 100000 };
export enum BiomeType { forest = 1 };


export interface GGAsset {
    texture: Texture;
    height: number;
    width: number;
    name: string;
    safeZone: number;
    groundSafeZone: number;
    collisionZone?: number;
    collisionZoneY?: number;
    level: AssetLevel;
    displacementRatio: number;
    sizeRatio: number;
}


export abstract class AssetManager {

    private static texturePath = './textures/';

    private static worldsAssets: { [key in BiomeType]: { [key: string]: Array<GGAsset> } } = {
        [BiomeType.forest]: {
            ground: new Array<GGAsset>(),
            tree: new Array<GGAsset>(),
            grass: new Array<GGAsset>(),
            rock: new Array<GGAsset>(),
            brush: new Array<GGAsset>(),
            bush: new Array<GGAsset>()
        }
    };

    static knight: Partial<GGAsset>;

    static knightTextures: { front: Texture; back: Texture; side: Texture; };

    static async loadAssets() {
        const knightFrontTxtr = await Assets.load(`${this.texturePath}/knight/front.png`);
        const knightBackTxtr = await Assets.load(`${this.texturePath}/knight/back.png`);
        const knightSideTxtr = await Assets.load(`${this.texturePath}/knight/side.png`);

        this.knight = {
            name: 'knight',
            texture: knightFrontTxtr,
            height: 100,
            width: 60,
            collisionZone: 5
        }

        this.knightTextures = {
            front: knightFrontTxtr,
            back: knightBackTxtr,
            side: knightSideTxtr
        }

        await this.loadForestAssets();
    }

    private static async loadForestAssets() {
        const forestGround = {
            name: 'ground',
            texture: await Assets.load(`${this.texturePath}/forest/ground_texture.png`),
            height: 500,
            width: 500,
            safeZone: 500,
            groundSafeZone: 500,
            displacementRatio: 0,
            sizeRatio: 0,
            level: AssetLevel.groundTexture
        }

        this.worldsAssets[BiomeType.forest].ground.push(forestGround);

        const tree = {
            name: 'tree',
            texture: await Assets.load(`${this.texturePath}/forest/tree.png`),
            height: 250,
            width: 250,
            safeZone: 250,
            groundSafeZone: 100,
            collisionZone: 85,
            collisionZoneY: 25,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            level: AssetLevel.large
        }
        this.worldsAssets[BiomeType.forest].tree.push(tree);

        const tree2 = {
            name: 'tree',
            texture: await Assets.load(`${this.texturePath}/forest/tree2.png`),
            height: 150,
            width: 125,
            safeZone: 120,
            groundSafeZone: 75,
            collisionZone: 50,
            collisionZoneY: 15,
            displacementRatio: 0.2,
            sizeRatio: 0.6,
            level: AssetLevel.large
        }
        this.worldsAssets[BiomeType.forest].tree.push(tree2);

        const tree3 = {
            name: 'tree',
            texture: await Assets.load(`${this.texturePath}/forest/tree3.png`),
            height: 150,
            width: 80,
            safeZone: 120,
            groundSafeZone: 75,
            collisionZone: 50,
            collisionZoneY: 15,
            displacementRatio: 0.2,
            sizeRatio: 0.6,
            level: AssetLevel.large
        }
        this.worldsAssets[BiomeType.forest].tree.push(tree3);

        const grass = {
            name: 'grass',
            texture: await Assets.load(`${this.texturePath}/forest/grass.png`),
            height: 40,
            width: 40,
            safeZone: 50,
            groundSafeZone: 50,
            displacementRatio: 0,
            sizeRatio: 0.5,
            level: AssetLevel.ground
        }
        this.worldsAssets[BiomeType.forest].grass.push(grass);

        const rock = {
            name: 'rock',
            texture: await Assets.load(`${this.texturePath}/forest/rock.png`),
            height: 50,
            width: 50,
            safeZone: 75,
            groundSafeZone: 75,
            collisionZone: 45,
            displacementRatio: 0.2,
            sizeRatio: 0.5,
            level: AssetLevel.player
        }
        this.worldsAssets[BiomeType.forest].rock.push(rock);

        const rock2 = {
            name: 'rock',
            texture: await Assets.load(`${this.texturePath}/forest/rock2.png`),
            height: 50,
            width: 50,
            safeZone: 75,
            groundSafeZone: 75,
            collisionZone: 45,
            displacementRatio: 0.2,
            sizeRatio: 0.5,
            level: AssetLevel.player
        }
        this.worldsAssets[BiomeType.forest].rock.push(rock2);


        const bush = {
            name: 'bush',
            texture: await Assets.load(`${this.texturePath}/forest/bush.png`),
            height: 75,
            width: 75,
            safeZone: 75,
            groundSafeZone: 75,
            collisionZone: 0,
            displacementRatio: 0.5,
            sizeRatio: 0.7,
            level: AssetLevel.player
        }
        this.worldsAssets[BiomeType.forest].bush.push(bush);

        const brush = {
            name: 'brush',
            texture: await Assets.load(`${this.texturePath}/forest/brush.png`),
            height: 70,
            width: 70,
            safeZone: 70,
            groundSafeZone: 70,
            collisionZone: 0,
            displacementRatio: 0.2,
            sizeRatio: 0.5,
            level: AssetLevel.player
        }
        this.worldsAssets[BiomeType.forest].brush.push(brush);
    }

    static getAsset(biome: BiomeType, name: string, randSeed: string): GGAsset {
        const items = this.worldsAssets[biome][name];

        if (items.length > 1) {
            const rand = Random.randomNumber(randSeed + "rndast") / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }
}



