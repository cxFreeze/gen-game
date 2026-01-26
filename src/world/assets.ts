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
import { BiomeAssetType, BiomeType, EnemyAsset, WorldAsset, ZoneAssetType, ZoneType } from '../models/interfaces.js';
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

    private static readonly zoneAssets: { [key in ZoneType]: { [key in ZoneAssetType]: Array<GGAsset> } } = {
        [ZoneType.town]: {
            ground: new Array<GG3DAsset>(),
            house: new Array<GG3DAsset>(),
            center: new Array<GG3DAsset>(),
            tower: new Array<GG3DAsset>(),
            plazaGround: new Array<GG3DAsset>()
        }
    };

    static readonly worldAssets = {} as { [key in WorldAsset]: GG3DAsset };
    static readonly enemiesAssets = {} as { [key in EnemyAsset]: GG3DAsset };
    static readonly animations: { [key: string]: AnimationGroup[] } = {};

    static projectile: Mesh;
    static flareSprite: Texture;

    static async loadAssets() {
        this.projectile = MeshBuilder.CreateSphere('projectile', { diameter: 1 }, App.scene);
        this.projectile.isVisible = false;
        this.projectile.isPickable = false;

        // Créer un matériau magique
        const magicMaterial = new StandardMaterial('magicMaterial', App.scene);
        magicMaterial.diffuseColor = new Color3(0.9, 0.3, 1);
        magicMaterial.emissiveColor = new Color3(0.8, 0.3, 0.3);
        magicMaterial.alpha = 0.9;

        // Ajouter une texture de bruit animée (perlin noise ou fractale)
        const noiseTexture = new Texture(`${this.texturesPath}/noise.png`, App.scene);
        noiseTexture.uScale = 1.5;
        noiseTexture.vScale = 1.5;
        noiseTexture.level = 0.6;
        magicMaterial.diffuseTexture = noiseTexture;
        magicMaterial.backFaceCulling = false;

        this.projectile.material = magicMaterial;

        this.flareSprite = new Texture(`${this.texturesPath}/flare.png`, App.scene);

        const player = new GG3DAsset('player', await this.load3DAsset(`${this.Assets3dPath}/player.glb`), undefined, this.animations[`${this.Assets3dPath}/player.glb`]);
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
        await this.loadTownAssets();
        await this.loadEnemyAssets();
    }

    private static async loadForestAssets() {
        const forestGround = new GG3DAsset('forestGround', MeshBuilder.CreateGround('forestGround', { width: this.groundTileSize, height: this.groundTileSize }), this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture.jpg`));
        forestGround.height = this.groundTileSize;
        forestGround.width = this.groundTileSize;
        forestGround.safeZone = this.groundTileSize;
        forestGround.isPickable = false;
        forestGround.type = 'ground';
        forestGround.mesh.material!.zOffset = 20;
        this.biomeAssets[BiomeType.forest].ground.push(forestGround);

        const tree1 = new GG3DAsset('tree1', await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`));
        tree1.safeZone = 50;
        tree1.displacementRatio = 0.2;
        tree1.sizeRatio = 0.4;
        tree1.scale = 75;
        tree1.maxVerticalDisplacement = 0.1;

        const tree2 = new GG3DAsset('tree2', await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`));
        tree2.safeZone = 50;
        tree2.displacementRatio = 0.2;
        tree2.sizeRatio = 0.4;
        tree2.scale = 75;
        tree2.maxVerticalDisplacement = 0.1;

        this.biomeAssets[BiomeType.forest].tree.push(tree1, tree2);

        const rock1 = new GG3DAsset('rock1', await this.load3DAsset(`${this.Assets3dPath}/forest/rock1.glb`));
        rock1.safeZone = 20;
        rock1.displacementRatio = 0.2;
        rock1.sizeRatio = 0.4;
        rock1.scale = 5;
        rock1.maxVerticalDisplacement = 0.3;

        const rock2 = new GG3DAsset('rock2', await this.load3DAsset(`${this.Assets3dPath}/forest/rock2.glb`));
        rock2.safeZone = 20;
        rock2.displacementRatio = 0.2;
        rock2.sizeRatio = 0.4;
        rock2.scale = 10;
        rock2.maxVerticalDisplacement = 0.3;

        this.biomeAssets[BiomeType.forest].rock.push(rock1, rock2);

        const grassSpriteManager = new SpriteManager('grassManager', `${this.texturesPath}/grass.png`, 10000, { width: 156, height: 153 }, App.scene);
        const grassSprite = new GGSpriteAsset('grass', grassSpriteManager);
        grassSprite.height = 15;
        grassSprite.width = 15;
        grassSprite.safeZone = 10;
        grassSprite.displacementRatio = 0.2;
        grassSprite.sizeRatio = 0.3;

        this.biomeAssets[BiomeType.forest].grass.push(grassSprite);
    }

    private static async loadTownAssets() {
        const townGround = new GG3DAsset('townGround', MeshBuilder.CreateDisc('disc', { radius: 250, tessellation: 128 }, App.scene), this.loadTextureAsset('townGround', `${this.texturesPath}/town/ground_texture.jpg`));
        townGround.mesh.rotation.x = Math.PI / 2;
        townGround.ignoreCollisions = true;
        townGround.isPickable = false;
        townGround.disableShadow = true;
        townGround.type = 'ground';

        const townTexture = (townGround.mesh.material as StandardMaterial).diffuseTexture as Texture;
        townTexture!.wrapU = Texture.WRAP_ADDRESSMODE;
        townTexture!.wrapV = Texture.WRAP_ADDRESSMODE;
        townTexture!.uScale = 10;
        townTexture!.vScale = 10;

        townGround.mesh.material!.zOffset = 10;

        this.zoneAssets[ZoneType.town].ground.push(townGround);

        const plazaGround = new GG3DAsset('plazaGround', MeshBuilder.CreateDisc('disc', { radius: 60, tessellation: 48 }, App.scene), this.loadTextureAsset('plazaGround', `${this.texturesPath}/town/plaza_ground_texture.jpg`));
        plazaGround.mesh.rotation.x = Math.PI / 2;
        plazaGround.ignoreCollisions = true;
        plazaGround.isPickable = false;
        plazaGround.disableShadow = true;

        const plazaTexture = (plazaGround.mesh.material as StandardMaterial).diffuseTexture as Texture;
        plazaTexture!.wrapU = Texture.WRAP_ADDRESSMODE;
        plazaTexture!.wrapV = Texture.WRAP_ADDRESSMODE;
        plazaTexture!.uScale = 3;
        plazaTexture!.vScale = 3;

        this.zoneAssets[ZoneType.town].plazaGround.push(plazaGround);

        const house1 = new GG3DAsset('house1', await this.load3DAsset(`${this.Assets3dPath}/town/house1.glb`));
        house1.safeZone = 80;
        house1.displacementRatio = 0.3;
        house1.sizeRatio = 0.2;
        house1.scale = 80;
        house1.createCollider(0.85);

        const house2 = new GG3DAsset('house2', await this.load3DAsset(`${this.Assets3dPath}/town/house2.glb`));
        house2.safeZone = 80;
        house2.displacementRatio = 0.3;
        house2.sizeRatio = 0.2;
        house2.scale = 80;
        house2.createCollider(0.9);

        const house3 = new GG3DAsset('house3', await this.load3DAsset(`${this.Assets3dPath}/town/house3.glb`));
        house3.safeZone = 80;
        house3.displacementRatio = 0.3;
        house3.sizeRatio = 0.2;
        house3.scale = 60;
        house3.createCollider(0.9);

        this.zoneAssets[ZoneType.town].house.push(house1, house2, house3);

        const tower = new GG3DAsset('tower', await this.load3DAsset(`${this.Assets3dPath}/town/tower.glb`));
        tower.safeZone = 500;
        tower.displacementRatio = 0.8;
        tower.sizeRatio = 0.1;
        tower.scale = 100;
        tower.createCollider(0.8);

        this.zoneAssets[ZoneType.town].tower.push(tower);

        const townCenter1 = new GG3DAsset('center1', await this.load3DAsset(`${this.Assets3dPath}/town/statue1.glb`));
        townCenter1.safeZone = 100;
        townCenter1.scale = 12;
        townCenter1.isPickable = false;
        townCenter1.rotation = Math.PI;
        townCenter1.createCollider(0.9);

        const townCenter2 = new GG3DAsset('center2', await this.load3DAsset(`${this.Assets3dPath}/town/statue2.glb`));
        townCenter2.safeZone = 100;
        townCenter2.scale = 20;
        townCenter2.isPickable = false;
        townCenter2.rotation = Math.PI;
        townCenter2.createCollider(0.9);

        this.zoneAssets[ZoneType.town].center.push(townCenter1, townCenter2);
    }

    static async loadEnemyAssets() {
        const blob = new GG3DAsset('blob', await this.load3DAsset(`${AssetManager.Assets3dPath}/enemies/blob.glb`));
        blob.scale = 10;

        this.enemiesAssets.blob = blob;
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

    static getZoneAsset(zone: ZoneType, name: ZoneAssetType, randSeed: string): GGAsset {
        const items = this.zoneAssets[zone][name];
        if (items.length > 1) {
            const rand = Random.randomNumber(`${randSeed}rndast`) / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    static getFirstZoneAsset(zone: ZoneType, name: ZoneAssetType): GGAsset {
        const items = this.zoneAssets[zone][name];
        return items[0];
    }

    static getFirstAsset(biome: BiomeType, name: BiomeAssetType): GGAsset {
        const items = this.biomeAssets[biome][name];
        return items[0];
    }

    private static async load3DAsset(path: string): Promise<Mesh> {
        const container = await loadAssetContainerAsync(path, App.scene);
        const meshes = container.meshes.splice(1);

        const mesh = meshes.length > 1 ? Mesh.MergeMeshes(meshes as Mesh[], true, true, undefined, false, true) as Mesh : meshes[0] as Mesh;

        this.animations[path] = [];
        container.animationGroups.forEach((anim) => {
            anim.enableBlending = true;
            anim.blendingSpeed = 0.06;
            this.animations[path].push(anim);
        });

        mesh.receiveShadows = true;
        return mesh;
    }

    private static loadTextureAsset(name: string, path: string): Material {
        const groundMat = new StandardMaterial(name, App.scene);
        groundMat.diffuseTexture = new Texture(path, App.scene);
        groundMat.specularColor = new Color3(0, 0, 0);
        return groundMat;
    }
}



