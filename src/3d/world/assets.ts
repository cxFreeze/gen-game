import { Random } from "../../utils/random.js";
import { Scene, loadAssetContainerAsync, Material, StandardMaterial, Texture, Mesh } from "babylonjs";

export enum BiomeType { forest = 1 };


export interface GGA3DAsset {
    mesh?: Mesh;
    material?: Material;
    height: number;
    width: number;
    name: string;
    scale: number;
    safeZone: number;
    groundSafeZone: number;
    collisionZone?: number;
    collisionZoneY?: number;
    displacementRatio: number;
    sizeRatio: number;
}


export abstract class AssetManager {

    private static Assets3dPath = './3d';
    private static texturesPath = './textures';

    private static worldsAssets: { [key in BiomeType]: { [key: string]: Array<GGA3DAsset> } } = {
        [BiomeType.forest]: {
            ground: new Array<GGA3DAsset>(),
            tree: new Array<GGA3DAsset>(),
            grass: new Array<GGA3DAsset>(),
            rock: new Array<GGA3DAsset>(),
            brush: new Array<GGA3DAsset>(),
            bush: new Array<GGA3DAsset>()
        }
    };

    static player: Partial<GGA3DAsset>;

    static async loadAssets(scene: Scene) {
        this.player = {
            mesh: await this.load3DAsset(`${this.Assets3dPath}/player.glb`, scene),
            height: 100,
            width: 60,
            name: 'player'
        }

        await this.loadForestAssets(scene);
    }

    private static async loadForestAssets(scene: Scene) {
        const forestGround: GGA3DAsset = {
            name: 'ground',
            material: this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture3d.jpg`, scene),
            height: 400,
            width: 400,
            safeZone: 400,
            groundSafeZone: 400,
            displacementRatio: 0,
            sizeRatio: 0,
            scale: 1

        }

        this.worldsAssets[BiomeType.forest].ground.push(forestGround);


        const tree: GGA3DAsset = {
            name: 'tree',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            groundSafeZone: 50,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            scale: 50
        }

        const tree2 = {
            name: 'tree2',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            groundSafeZone: 50,
            displacementRatio: 0.2,
            sizeRatio: 0.4,
            scale: 50
        }

        this.worldsAssets[BiomeType.forest].tree.push(tree);
        this.worldsAssets[BiomeType.forest].tree.push(tree2);

        const rock = {
            name: 'rock',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/rock.glb`, scene),
            height: 50,
            width: 50,
            safeZone: 50,
            groundSafeZone: 50,
            displacementRatio: 0.2,
            sizeRatio: 0.8,
            scale: 15
        }

        this.worldsAssets[BiomeType.forest].rock.push(rock);
    }

    static getAsset(biome: BiomeType, name: string, randSeed: string): GGA3DAsset {
        const items = this.worldsAssets[biome][name];

        if (items.length > 1) {
            const rand = Random.randomNumber(randSeed + "rndast") / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    private static async load3DAsset(path: string, scene: Scene): Promise<Mesh> {
        const container = await loadAssetContainerAsync(path, scene);
        return container.meshes[1] as Mesh;
    }

    private static loadTextureAsset(name: string, path: string, scene: Scene): Material {
        const groundMat = new StandardMaterial(name, scene);
        groundMat.ambientTexture = new Texture(path, scene);
        return groundMat;
    }
}



