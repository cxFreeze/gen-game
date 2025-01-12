import { AnimationGroup, Color3, loadAssetContainerAsync, Material, Mesh, SpriteManager, StandardMaterial, Texture, Vector2 } from '@babylonjs/core';
import { WaterMaterial } from '@babylonjs/materials';
import { App } from '../app.js';
import { AssetType, BiomeType, GGA3DAsset } from '../interfaces.js';
import { Random } from '../utils/random.js';


export class AssetManager {

    private static readonly Assets3dPath = './3d';
    private static readonly texturesPath = './textures';

    private static readonly worldsAssets: { [key in BiomeType]: { [key in AssetType]: Array<GGA3DAsset> } } = {
        [BiomeType.forest]: {
            ground: new Array<GGA3DAsset>(),
            tree: new Array<GGA3DAsset>(),
            rock: new Array<GGA3DAsset>(),
            grass: new Array<GGA3DAsset>()
        }
    };

    static animations: { [key: string]: AnimationGroup } = {};

    static player: Partial<GGA3DAsset>;

    static waterGround: GGA3DAsset;

    static async loadAssets() {
        this.player = {
            mesh: await this.load3DAsset(`${this.Assets3dPath}/player.glb`),
            height: 100,
            width: 60,
            name: 'player',
            scale: 13,
            type: 'player',
        };

        this.waterGround = {
            name: 'waterGround',
            material: this.loadTextureAsset('waterGround', `${this.texturesPath}/water_texture.jpg`),
            height: 200,
            width: 200,
            safeZone: 200,
            displacementRatio: 0,
            sizeRatio: 0,
            scale: 1,
            type: 'ground'
        };

        await this.loadForestAssets();
    }

    private static async loadForestAssets() {
        const forestGround: GGA3DAsset = {
            name: 'ground',
            material: this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture.jpg`),
            height: 200,
            width: 200,
            safeZone: 200,
            displacementRatio: 0,
            sizeRatio: 0,
            scale: 1,
            type: 'ground'
        };

        this.worldsAssets[BiomeType.forest].ground.push(forestGround);


        const tree: GGA3DAsset = {
            name: 'tree',
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`),
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
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`),
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
            mesh: await this.load3DAsset(`${this.Assets3dPath}/forest/rock.glb`),
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

        const spriteManager = new SpriteManager('grassManager', `${this.texturesPath}/grass.png`, 10000, { width: 156, height: 156 }, App.scene);
        const grass: GGA3DAsset = {
            name: 'grass',
            sprite: spriteManager,
            height: 15,
            width: 15,
            safeZone: 10,
            displacementRatio: 0.2,
            sizeRatio: 0.3,
            scale: 1,
            type: 'sprite',
            ignoreCollisions: true,
        };

        this.worldsAssets[BiomeType.forest].grass.push(grass);
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

    static getFirstAsset(biome: BiomeType, name: AssetType): GGA3DAsset {
        const items = this.worldsAssets[biome][name];
        return items[0];
    }

    private static async load3DAsset(path: string): Promise<Mesh> {
        const container = await loadAssetContainerAsync(path, App.scene);
        const mesh = container.meshes[1] as Mesh;
        container.animationGroups.forEach((anim) => {
            anim.enableBlending = true;
            anim.blendingSpeed = 0.06;
            this.animations[anim.name] = anim;
        });

        mesh.receiveShadows = true;
        return mesh;
    }

    private static loadTextureAsset(name: string, path: string): Material {
        const groundMat = new StandardMaterial(name, App.scene);
        groundMat.ambientTexture = new Texture(path, App.scene);
        groundMat.specularColor = new Color3(0, 0, 0);
        return groundMat;
    }

    private static loadWaterTextureAsset(name: string, path: string): Material {
        const groundMat = new WaterMaterial(name, App.scene);
        groundMat.bumpTexture = new Texture(path, App.scene);
        groundMat.windForce = 10;
        groundMat.waveHeight = 5;
        groundMat.waveLength = 1000;
        groundMat.bumpHeight = 10;
        groundMat.windDirection = new Vector2(1, 1);
        groundMat.waterColor = new Color3(0, 0.1, 0);
        groundMat.colorBlendFactor = 0.8;
        return groundMat;
    }
}



