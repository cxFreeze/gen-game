import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup.js';
import { AssetContainer } from '@babylonjs/core/assetContainer.js';
import { loadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
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
import { GG3DAsset, GGSpriteAsset } from './GGAsset.js';

interface BiomeAssetByType {
    ground: GG3DAsset;
    tree: GG3DAsset;
    rock: GG3DAsset;
    grass: GGSpriteAsset;
}

type BiomeAssetCollection = {
    [AssetType in BiomeAssetType]: Array<BiomeAssetByType[AssetType]>;
};

type ZoneAssetCollection = {
    [AssetType in ZoneAssetType]: GG3DAsset[];
};

interface TextureAsset {
    material: StandardMaterial;
    texture: Texture;
}


export class AssetManager {
    private static readonly containers = new Set<AssetContainer>();

    static dispose() {
        this.containers.forEach(container => container.dispose());
        this.containers.clear();
        Object.values(this.biomeAssets).forEach(collection => {
            Object.values(collection).forEach(assets => {
                assets.length = 0;
            });
        });
        Object.values(this.zoneAssets).forEach(collection => {
            Object.values(collection).forEach(assets => {
                assets.length = 0;
            });
        });
        this.worldAssets.clear();
        this.enemyAssets.clear();
        Object.keys(this.animations).forEach(path => {
            delete this.animations[path];
        });
        this._projectile?.dispose();
        this._flareSprite?.dispose();
        this._projectile = undefined;
        this._flareSprite = undefined;
    }

    private static readonly groundTileSize = Params.chunckSize / 2;

    private static readonly Assets3dPath = './3d';
    private static readonly texturesPath = './textures';

    private static readonly biomeAssets: { [key in BiomeType]: BiomeAssetCollection } = {
        [BiomeType.forest]: {
            ground: new Array<GG3DAsset>(),
            tree: new Array<GG3DAsset>(),
            rock: new Array<GG3DAsset>(),
            grass: new Array<GGSpriteAsset>()
        }
    };

    private static readonly zoneAssets: { [key in ZoneType]: ZoneAssetCollection } = {
        [ZoneType.town]: {
            ground: new Array<GG3DAsset>(),
            house: new Array<GG3DAsset>(),
            center: new Array<GG3DAsset>(),
            tower: new Array<GG3DAsset>(),
            plazaGround: new Array<GG3DAsset>()
        }
    };

    private static readonly worldAssets = new Map<WorldAsset, GG3DAsset>();
    private static readonly enemyAssets = new Map<EnemyAsset, GG3DAsset>();
    static readonly animations: { [key: string]: AnimationGroup[] } = {};

    private static _projectile: Mesh | undefined;
    static get projectile(): Mesh {
        if (!this._projectile) {
            throw new Error('Projectile assets are not loaded');
        }
        return this._projectile;
    }

    private static _flareSprite: Texture | undefined;
    static get flareSprite(): Texture {
        if (!this._flareSprite) {
            throw new Error('Flare assets are not loaded');
        }
        return this._flareSprite;
    }

    static async loadAssets(signal: AbortSignal) {
        signal.throwIfAborted();
        this._projectile = MeshBuilder.CreateSphere('projectile', { diameter: 1 }, App.scene);
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

        this._flareSprite = new Texture(`${this.texturesPath}/flare.png`, App.scene);

        const playerMesh = await this.load3DAsset(`${this.Assets3dPath}/player.glb`, signal);
        signal.throwIfAborted();
        const player = new GG3DAsset('player', playerMesh, undefined, this.animations[`${this.Assets3dPath}/player.glb`]);
        player.scale = 13;
        player.type = 'player';
        this.worldAssets.set('player', player);

        const oceanTexture = this.loadTextureAsset('waterGround', `${this.texturesPath}/water_texture.jpg`);
        const ocean = new GG3DAsset('ocean', MeshBuilder.CreateGround('ocean', { width: this.groundTileSize, height: this.groundTileSize }), oceanTexture.material);
        ocean.height = this.groundTileSize;
        ocean.width = this.groundTileSize;
        ocean.safeZone = this.groundTileSize;
        ocean.type = 'ground';
        ocean.ignoreCollisions = true;
        ocean.isPickable = false;
        this.worldAssets.set('ocean', ocean);

        const fenceMesh = await this.load3DAsset(`${this.Assets3dPath}/fence.glb`, signal);
        signal.throwIfAborted();
        const fence = new GG3DAsset('fence', fenceMesh);
        fence.scale = 22;
        fence.ignoreCollisions = true;
        fence.isPickable = false;
        fence.disableShadow = true;
        this.worldAssets.set('fence', fence);

        await this.loadForestAssets(signal);
        signal.throwIfAborted();
        await this.loadTownAssets(signal);
        signal.throwIfAborted();
        await this.loadEnemyAssets(signal);
        signal.throwIfAborted();
    }

    private static async loadForestAssets(signal: AbortSignal) {
        const forestTexture = this.loadTextureAsset('forestGround', `${this.texturesPath}/forest/ground_texture.jpg`);
        const forestGround = new GG3DAsset('forestGround', MeshBuilder.CreateGround('forestGround', { width: this.groundTileSize, height: this.groundTileSize }), forestTexture.material);
        forestGround.height = this.groundTileSize;
        forestGround.width = this.groundTileSize;
        forestGround.safeZone = this.groundTileSize;
        forestGround.isPickable = false;
        forestGround.type = 'ground';
        forestTexture.material.zOffset = 20;
        this.biomeAssets[BiomeType.forest].ground.push(forestGround);

        const tree1Mesh = await this.load3DAsset(`${this.Assets3dPath}/forest/tree1.glb`, signal);
        signal.throwIfAborted();
        const tree1 = new GG3DAsset('tree1', tree1Mesh);
        tree1.safeZone = 50;
        tree1.displacementRatio = 0.2;
        tree1.sizeRatio = 0.4;
        tree1.scale = 75;
        tree1.maxVerticalDisplacement = 0.1;

        const tree2Mesh = await this.load3DAsset(`${this.Assets3dPath}/forest/tree2.glb`, signal);
        signal.throwIfAborted();
        const tree2 = new GG3DAsset('tree2', tree2Mesh);
        tree2.safeZone = 50;
        tree2.displacementRatio = 0.2;
        tree2.sizeRatio = 0.4;
        tree2.scale = 75;
        tree2.maxVerticalDisplacement = 0.1;

        this.biomeAssets[BiomeType.forest].tree.push(tree1, tree2);

        const rock1Mesh = await this.load3DAsset(`${this.Assets3dPath}/forest/rock1.glb`, signal);
        signal.throwIfAborted();
        const rock1 = new GG3DAsset('rock1', rock1Mesh);
        rock1.safeZone = 20;
        rock1.displacementRatio = 0.2;
        rock1.sizeRatio = 0.4;
        rock1.scale = 5;
        rock1.maxVerticalDisplacement = 0.3;

        const rock2Mesh = await this.load3DAsset(`${this.Assets3dPath}/forest/rock2.glb`, signal);
        signal.throwIfAborted();
        const rock2 = new GG3DAsset('rock2', rock2Mesh);
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

    private static async loadTownAssets(signal: AbortSignal) {
        const townTextureAsset = this.loadTextureAsset('townGround', `${this.texturesPath}/town/ground_texture.jpg`);
        const townGround = new GG3DAsset('townGround', MeshBuilder.CreateDisc('disc', { radius: 250, tessellation: 128 }, App.scene), townTextureAsset.material);
        townGround.mesh.rotation.x = Math.PI / 2;
        townGround.ignoreCollisions = true;
        townGround.isPickable = false;
        townGround.disableShadow = true;
        townGround.type = 'ground';

        townTextureAsset.texture.wrapU = Texture.WRAP_ADDRESSMODE;
        townTextureAsset.texture.wrapV = Texture.WRAP_ADDRESSMODE;
        townTextureAsset.texture.uScale = 10;
        townTextureAsset.texture.vScale = 10;

        townTextureAsset.material.zOffset = 10;

        this.zoneAssets[ZoneType.town].ground.push(townGround);

        const plazaTextureAsset = this.loadTextureAsset('plazaGround', `${this.texturesPath}/town/plaza_ground_texture.jpg`);
        const plazaGround = new GG3DAsset('plazaGround', MeshBuilder.CreateDisc('disc', { radius: 60, tessellation: 48 }, App.scene), plazaTextureAsset.material);
        plazaGround.mesh.rotation.x = Math.PI / 2;
        plazaGround.ignoreCollisions = true;
        plazaGround.isPickable = false;
        plazaGround.disableShadow = true;

        plazaTextureAsset.texture.wrapU = Texture.WRAP_ADDRESSMODE;
        plazaTextureAsset.texture.wrapV = Texture.WRAP_ADDRESSMODE;
        plazaTextureAsset.texture.uScale = 3;
        plazaTextureAsset.texture.vScale = 3;

        this.zoneAssets[ZoneType.town].plazaGround.push(plazaGround);

        const house1Mesh = await this.load3DAsset(`${this.Assets3dPath}/town/house1.glb`, signal);
        signal.throwIfAborted();
        const house1 = new GG3DAsset('house1', house1Mesh);
        house1.safeZone = 80;
        house1.displacementRatio = 0.3;
        house1.sizeRatio = 0.2;
        house1.scale = 80;
        house1.createCollider(0.85);

        const house2Mesh = await this.load3DAsset(`${this.Assets3dPath}/town/house2.glb`, signal);
        signal.throwIfAborted();
        const house2 = new GG3DAsset('house2', house2Mesh);
        house2.safeZone = 80;
        house2.displacementRatio = 0.3;
        house2.sizeRatio = 0.2;
        house2.scale = 80;
        house2.createCollider(0.9);

        const house3Mesh = await this.load3DAsset(`${this.Assets3dPath}/town/house3.glb`, signal);
        signal.throwIfAborted();
        const house3 = new GG3DAsset('house3', house3Mesh);
        house3.safeZone = 80;
        house3.displacementRatio = 0.3;
        house3.sizeRatio = 0.2;
        house3.scale = 60;
        house3.createCollider(0.9);

        this.zoneAssets[ZoneType.town].house.push(house1, house2, house3);

        const towerMesh = await this.load3DAsset(`${this.Assets3dPath}/town/tower.glb`, signal);
        signal.throwIfAborted();
        const tower = new GG3DAsset('tower', towerMesh);
        tower.safeZone = 500;
        tower.displacementRatio = 0.8;
        tower.sizeRatio = 0.1;
        tower.scale = 100;
        tower.createCollider(0.8);

        this.zoneAssets[ZoneType.town].tower.push(tower);

        const townCenter1Mesh = await this.load3DAsset(`${this.Assets3dPath}/town/statue1.glb`, signal);
        signal.throwIfAborted();
        const townCenter1 = new GG3DAsset('center1', townCenter1Mesh);
        townCenter1.safeZone = 100;
        townCenter1.scale = 12;
        townCenter1.isPickable = false;
        townCenter1.rotation = Math.PI;
        townCenter1.createCollider(0.9);

        const townCenter2Mesh = await this.load3DAsset(`${this.Assets3dPath}/town/statue2.glb`, signal);
        signal.throwIfAborted();
        const townCenter2 = new GG3DAsset('center2', townCenter2Mesh);
        townCenter2.safeZone = 100;
        townCenter2.scale = 20;
        townCenter2.isPickable = false;
        townCenter2.rotation = Math.PI;
        townCenter2.createCollider(0.9);

        this.zoneAssets[ZoneType.town].center.push(townCenter1, townCenter2);
    }

    static async loadEnemyAssets(signal: AbortSignal) {
        const blobMesh = await this.load3DAsset(`${AssetManager.Assets3dPath}/enemies/blob.glb`, signal);
        signal.throwIfAborted();
        const blob = new GG3DAsset('blob', blobMesh);
        blob.scale = 10;

        this.enemyAssets.set('blob', blob);
    }

    static getWorldAsset(name: WorldAsset): GG3DAsset {
        return this.getRequiredAsset(this.worldAssets, name);
    }

    static getEnemyAsset(name: EnemyAsset): GG3DAsset {
        return this.getRequiredAsset(this.enemyAssets, name);
    }

    static getAsset<AssetType extends BiomeAssetType>(biome: BiomeType, name: AssetType, randSeed: string): BiomeAssetByType[AssetType] {
        const items = this.biomeAssets[biome][name];

        if (items.length > 1) {
            const rand = Random.randomNumber(`${randSeed}rndast`) / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    static getZoneAsset(zone: ZoneType, name: ZoneAssetType, randSeed: string): GG3DAsset {
        const items = this.zoneAssets[zone][name];
        if (items.length > 1) {
            const rand = Random.randomNumber(`${randSeed}rndast`) / 100;
            const index = Math.abs(Math.floor(rand * items.length - 0.01));
            return items[index];
        }
        return items[0];
    }

    static getFirstZoneAsset(zone: ZoneType, name: ZoneAssetType): GG3DAsset {
        const items = this.zoneAssets[zone][name];
        return items[0];
    }

    static getFirstAsset<AssetType extends BiomeAssetType>(biome: BiomeType, name: AssetType): BiomeAssetByType[AssetType] {
        const items = this.biomeAssets[biome][name];
        return items[0];
    }

    private static getRequiredAsset<AssetType extends string>(assets: ReadonlyMap<AssetType, GG3DAsset>, name: AssetType): GG3DAsset {
        const asset = assets.get(name);
        if (!asset) {
            throw new Error(`Asset not loaded: ${name}`);
        }
        return asset;
    }

    private static async load3DAsset(path: string, signal: AbortSignal): Promise<Mesh> {
        signal.throwIfAborted();
        const container = await loadAssetContainerAsync(path, App.scene);
        if (signal.aborted) {
            container.dispose();
            signal.throwIfAborted();
        }
        this.containers.add(container);
        const meshes = container.meshes.slice(1).filter((mesh): mesh is Mesh => mesh instanceof Mesh);

        if (meshes.length === 0) {
            throw new Error(`No mesh found in 3D asset: ${path}`);
        }

        const mesh = meshes.length > 1 ? Mesh.MergeMeshes(meshes, true, true, undefined, false, true) : meshes[0];

        if (!mesh) {
            throw new Error(`Unable to merge meshes from 3D asset: ${path}`);
        }

        this.animations[path] = [];
        container.animationGroups.forEach((anim) => {
            anim.enableBlending = true;
            anim.blendingSpeed = 0.06;
            this.animations[path].push(anim);
        });

        mesh.receiveShadows = true;
        return mesh;
    }

    private static loadTextureAsset(name: string, path: string): TextureAsset {
        const groundMat = new StandardMaterial(name, App.scene);
        const texture = new Texture(path, App.scene);
        groundMat.diffuseTexture = texture;
        groundMat.specularColor = new Color3(0, 0, 0);
        return { material: groundMat, texture };
    }
}



