import { AnimationGroup, Color3, loadAssetContainerAsync, Material, Mesh, Scene, StandardMaterial, Texture } from '@babylonjs/core';
import { Random } from '../../utils/random.js';

export enum BiomeType { forest = 1 };

export type AssetType = 'ground' | 'tree' | 'rock' | 'stump';

export interface GGA3DAsset {
    mesh?: Mesh;
    material?: Material;
    height: number;
    width: number;
    name: string;
    scale: number;
    safeZone: number;
    displacementRatio: number;
    sizeRatio: number;
    type: 'ground' | 'item' | 'player';
    ignoreCollisions?: boolean;
    maxVerticalDisplacement?: number;
}


export abstract class AssetManager {

    private static Assets3dPath = './3d';
    private static texturesPath = './textures';

    private static worldsAssets: { [key in BiomeType]: { [key in AssetType]: Array<GGA3DAsset> } } = {
        [BiomeType.forest]: {
            ground: new Array<GGA3DAsset>(),
            tree: new Array<GGA3DAsset>(),
            rock: new Array<GGA3DAsset>(),
            stump: new Array<GGA3DAsset>()
        }
    };

    static animations: { [key: string]: AnimationGroup } = {};

    static player: Partial<GGA3DAsset>;

    static async loadAssets(scene: Scene) {
        this.player = {
            mesh: await this.load3DAsset(`${this.Assets3dPath}/player.glb`, scene),
            height: 100,
            width: 60,
            name: 'player',
            scale: 13,
            type: 'player',
        };

        await this.loadForestAssets(scene);
    }

    private static async loadForestAssets(scene: Scene) {
        const forestGround: GGA3DAsset = {
            name: 'ground',
            material: this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture3d.jpg`, scene),
            height: 400,
            width: 400,
            safeZone: 400,
            displacementRatio: 0,
            sizeRatio: 0,
            scale: 1,
            type: 'ground'
        };

        this.worldsAssets[BiomeType.forest].ground.push(forestGround);


        const tree: GGA3DAsset = {
            name: 'tree',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            scale: 75,
            type: 'item',
            maxVerticalDisplacement: 0.2
        };

        const tree2: GGA3DAsset = {
            name: 'tree2',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            scale: 75,
            type: 'item',
            maxVerticalDisplacement: 0.2
        };

        this.worldsAssets[BiomeType.forest].tree.push(tree);
        this.worldsAssets[BiomeType.forest].tree.push(tree2);

        const rock: GGA3DAsset = {
            name: 'rock',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/rock.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 20,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            scale: 15,
            type: 'item',
            maxVerticalDisplacement: 0.8
        };

        this.worldsAssets[BiomeType.forest].rock.push(rock);

        const stump: GGA3DAsset = {
            name: 'stump',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/stump.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            displacementRatio: 0.6,
            sizeRatio: 0.8,
            scale: 50,
            type: 'item',
            maxVerticalDisplacement: 0.8
        };

        this.worldsAssets[BiomeType.forest].stump.push(stump);
    }

    static getAsset(biome: BiomeType, name: AssetType, randSeed: string): GGA3DAsset {
        const items = this.worldsAssets[biome][name];

        if (items.length > 1) {
            const rand = Random.randomNumber(`${randSeed}rndast`) / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    private static async load3DAsset(path: string, scene: Scene): Promise<Mesh> {
        const container = await loadAssetContainerAsync(path, scene);
        const mesh = container.meshes[1] as Mesh;
        container.animationGroups.forEach((anim) => {
            anim.enableBlending = true;
            anim.blendingSpeed = 0.06;
            this.animations[anim.name] = anim;

        });
        return mesh;
    }

    private static loadTextureAsset(name: string, path: string, scene: Scene): Material {
        const groundMat = new StandardMaterial(name, scene);
        groundMat.ambientTexture = new Texture(path, scene);
        groundMat.specularColor = new Color3(0, 0, 0);
        return groundMat;
    }
}



