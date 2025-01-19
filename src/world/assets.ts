import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import { loadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { Material } from '@babylonjs/core/Materials/material.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import { App } from '../core/app.js';
import { Params } from '../core/params.js';
import { BiomeAssetType, BiomeType, WorldAsset } from '../models/interfaces.js';
import { Random } from '../utils/random.js';
import { GG3DAsset, GGAsset, GGSpriteAsset } from './GGAsset.js';


export class AssetManager {

    private static readonly groundTileSize = Params.chunckSize / 2;

    private static readonly Assets3dPath = './3d';
    private static readonly texturesPath = './textures';

    private static readonly biomeAssets: { [key in BiomeType]: { [key in BiomeAssetType]: Array<GGAsset> } } = {
        [BiomeType.forest]: {
            ground: new Array<GG3DAsset>(),
            tree: new Array<GG3DAsset>(),
            rock: new Array<GG3DAsset>(),
            grass: new Array<GGSpriteAsset>()
        }
    };

    static readonly worldAssets = {} as { [key in WorldAsset]: GG3DAsset };
    static readonly animations: { [key: string]: AnimationGroup } = {};

    static async loadAssets() {
        const player = new GG3DAsset('player', await this.load3DAsset(`${this.Assets3dPath}/player.glb`));
        player.scale = 13;
        player.type = 'player';
        this.worldAssets.player = player;

        const ocean = new GG3DAsset('ocean', MeshBuilder.CreateGround('ocean', { width: this.groundTileSize, height: this.groundTileSize }), this.loadTextureAsset('waterGround', `${this.texturesPath}/water_texture.jpg`));
        ocean.height = this.groundTileSize;
        ocean.width = this.groundTileSize;
        ocean.safeZone = this.groundTileSize;
        ocean.type = 'ground';
        ocean.ignoreCollisions = true;
        ocean.isPickable = false;
        this.worldAssets.ocean = ocean;

        const fence = new GG3DAsset('fence', await this.load3DAsset(`${this.Assets3dPath}/fence.glb`));
        fence.scale = 22;
        fence.ignoreCollisions = true;
        fence.isPickable = false;
        fence.disableShadow = true;
        this.worldAssets.fence = fence;

        await this.loadForestAssets();
    }

    private static async loadForestAssets() {
        const forestGround = new GG3DAsset('forestGround', MeshBuilder.CreateGround('forestGround', { width: this.groundTileSize, height: this.groundTileSize }), this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture.jpg`));
        forestGround.height = this.groundTileSize;
        forestGround.width = this.groundTileSize;
        forestGround.safeZone = this.groundTileSize;
        forestGround.isPickable = false;
        forestGround.type = 'ground';
        this.biomeAssets[BiomeType.forest].ground.push(forestGround);

        const tree1 = new GG3DAsset('tree1', await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`));
        tree1.safeZone = 50;
        tree1.displacementRatio = 0.2;
        tree1.sizeRatio = 0.4;
        tree1.scale = 75;
        tree1.maxVerticalDisplacement = 0.2;

        const tree2 = new GG3DAsset('tree2', await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`));
        tree2.safeZone = 50;
        tree2.displacementRatio = 0.2;
        tree2.sizeRatio = 0.4;
        tree2.scale = 75;
        tree2.maxVerticalDisplacement = 0.2;

        this.biomeAssets[BiomeType.forest].tree.push(tree1);
        this.biomeAssets[BiomeType.forest].tree.push(tree2);

        const rock = new GG3DAsset('rock', await this.load3DAsset(`${this.Assets3dPath}/forest/rock.glb`));
        rock.safeZone = 20;
        rock.displacementRatio = 0.2;
        rock.sizeRatio = 0.4;
        rock.scale = 15;
        rock.maxVerticalDisplacement = 0.5;

        this.biomeAssets[BiomeType.forest].rock.push(rock);

        const grassSpriteManager = new SpriteManager('grassManager', `${this.texturesPath}/grass.png`, 10000, { width: 156, height: 156 }, App.scene);
        const grassSprite = new GGSpriteAsset('grass', grassSpriteManager);
        grassSprite.height = 15;
        grassSprite.width = 15;
        grassSprite.safeZone = 10;
        grassSprite.displacementRatio = 0.2;
        grassSprite.sizeRatio = 0.3;

        this.biomeAssets[BiomeType.forest].grass.push(grassSprite);
    }

    static getAsset(biome: BiomeType, name: BiomeAssetType, randSeed: string): GGAsset {
        const items = this.biomeAssets[biome][name];

        if (items.length > 1) {
            const rand = Random.randomNumber(`${randSeed}rndast`) / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    static getFirstAsset(biome: BiomeType, name: BiomeAssetType): GGAsset {
        const items = this.biomeAssets[biome][name];
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
}



