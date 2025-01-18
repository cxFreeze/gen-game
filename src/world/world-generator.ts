import { AbstractMesh, InstancedMesh, Sprite, Vector3 } from '@babylonjs/core';
import { App } from '../core/app';
import { Params } from '../core/params';
import { BiomeAssetType, BiomeItem, BiomeType, LoadedMesh, LoadedSprite } from '../models/interfaces';
import { Random } from '../utils/random';
import { WorldUtils } from '../utils/world-utils';
import { AssetManager } from './assets';
import { Biomes } from './biomes';
import { GG3DAsset, GGAsset, GGSpriteAsset } from './GGAsset';
import { LightingManager } from './lighting';

export class WorldGenerator {

    private itemCnt = 0;

    private readonly enableDeviation = true;

    private readonly chunckSize = Params.chunckSize;
    private readonly bchunckSize = Params.bchunckSize;
    private readonly spawnNoDrawZone = Params.spawnNoDrawZone;
    private readonly itemLoadBatchSize = Params.itemLoadBatchSize;

    private readonly currentBiome = BiomeType.forest;

    private currentChunk: string;
    private readonly loadedChuncksItems: { [key: string]: { meshes: LoadedMesh[], sprites: LoadedSprite[] } } = {};

    private readonly renderQueue: Array<() => void> = [];

    private readonly lightingManager = LightingManager.getInstance();

    private static instance: WorldGenerator;
    static getInstance(): WorldGenerator {
        if (!this.instance) {
            this.instance = new WorldGenerator();
        }
        return this.instance;
    }

    private constructor() {
        this.initRenderLoopExtras();

        this.loadFences();
    }

    private initRenderLoopExtras() {
        App.scene.onBeforeRenderObservable.add(() => {
            for (let i = 0; i < this.itemLoadBatchSize; i++) {
                if (this.renderQueue.length === 0) {
                    break;
                }
                this.renderQueue.shift()!();
            }

            const time = performance.now() * 0.002; // Temps simulé (ralenti)
            const waveSpeed = 0.5; // Vitesse de propagation de l'onde
            const waveAmplitude = 0.07; // Amplitude du mouvement
            const waveFrequency = 10; // Fréquence spatiale

            // sprite animation
            Object.keys(this.loadedChuncksItems).forEach((chunk) => {
                this.loadedChuncksItems[chunk]?.sprites.forEach((item) => {
                    const x = item.sprite.position.x;
                    const z = item.sprite.position.z;
                    const wave = Math.sin(x * waveFrequency + time * waveSpeed) *
                        Math.cos(z * waveFrequency + time * waveSpeed) *
                        waveAmplitude;
                    item.sprite.angle = wave;
                });
            });
        });
    }


    // CHUNCK MANAGEMENT

    private getChunk(x: number, y: number) {
        const chuckX = Math.round(x / this.chunckSize) * this.chunckSize;
        const chuckY = Math.round(y / this.chunckSize) * this.chunckSize;
        return `${chuckX}/${chuckY}`;
    }

    private getBchunk(x: number, y: number) {
        const bchuckX = Math.round(x / this.bchunckSize) * this.bchunckSize;
        const bchuckY = Math.round(y / this.bchunckSize) * this.bchunckSize;
        return `${bchuckX}/${bchuckY}`;
    }

    private getChunksToLoad() {
        const [currentChuckX, currentChuckY] = this.currentChunk.split('/').map((val) => parseInt(val));
        const chucks = [];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                chucks.push(`${currentChuckX + i * this.chunckSize}/${currentChuckY + j * this.chunckSize}`);
            }
        }
        return chucks;
    }

    generateWorld(x: number, y: number) {
        const currentChunk = this.getChunk(x, y);
        if (currentChunk === this.currentChunk) {
            return;
        }

        this.currentChunk = currentChunk;

        const timeoutDelay = 100;
        let timeout = 0;

        const chuncks = this.getChunksToLoad();

        //unload 
        Object.keys(this.loadedChuncksItems).forEach((chunk) => {
            if (!chuncks.includes(chunk)) {
                setTimeout(() => {
                    this.unloadChunk(chunk);
                }, timeout);
                timeout += timeoutDelay;
            }
        });

        //load
        chuncks.forEach((chunk) => {
            if (!this.loadedChuncksItems[chunk]) {
                setTimeout(() => {
                    this.loadChunk(chunk);
                }, timeout);
                timeout += timeoutDelay;
            }
        });
    }

    private unloadChunk(chunk: string) {
        if (!this.loadedChuncksItems[chunk]) {
            return;
        }

        this.renderQueue.push(() => {
            if (!this.loadedChuncksItems[chunk]) {
                return;
            }
            this.loadedChuncksItems[chunk].meshes.forEach((item) => {
                this.deleteMeshFromScene(item.mesh);
                item = null as never;
            });

            this.loadedChuncksItems[chunk].sprites.forEach((item) => {
                this.deleteSpriteFromScene(item.sprite);
                item = null as never;
            });
            delete this.loadedChuncksItems[chunk];
        });
    }

    private loadChunk(chunk: string) {
        if (this.loadedChuncksItems[chunk]) {
            return;
        }
        this.loadedChuncksItems[chunk] = { meshes: [], sprites: [] };
        const [x, y] = chunk.split('/').map((val) => parseInt(val));

        if (!WorldUtils.isInWorldBounds(x, y)) {
            this.loadGround(x, y, AssetManager.worldAssets.ocean);
            return;
        }
        this.loadGround(x, y);
        this.loadItems(x, y);
    }

    private loadGround(chunkX: number, chunkY: number, asset: GG3DAsset | null = null): void {
        const assetType = Biomes.biomes[this.currentBiome].ground;

        const bound = this.chunckSize / 2;
        let xIndex = -bound;

        while (xIndex < bound) {
            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex < bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                const rAsset = asset ?? AssetManager.getAsset(this.currentBiome, assetType, assetType + absX + absY) as GG3DAsset;

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }


                const ground = rAsset.mesh.createInstance(rAsset.name + this.itemCnt);
                this.itemCnt++;


                ground.position = new Vector3(absX + rAsset.width / 2, 0, absY + rAsset.height / 2);
                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: ground, asset: rAsset });
            }
            xIndex += biggestAsset;
        }
    }

    private loadFences() {
        const fence = AssetManager.worldAssets.fence;

        const worldSize = Params.safeDrawWorldSize + 20;

        // ajust scale to match world size multiple
        const fenceOriginalWidth = fence.sizeX;
        let fenceWidth = fenceOriginalWidth * fence.scale;
        const numFences = Math.floor(worldSize / fenceWidth);
        fenceWidth = worldSize / numFences;
        fence.scale = fenceWidth / fenceOriginalWidth;

        const origDrawPointVariable = -worldSize / 2 + fenceWidth / 2;
        const origDrawPointConst = worldSize / 2;

        let y = origDrawPointVariable;
        let x = -origDrawPointConst;

        while (y < worldSize / 2) {
            this.drawItem(fence, x, y, 0, 1, Math.PI / 2);
            y += fenceWidth!;
        }

        y = origDrawPointVariable;
        x = origDrawPointConst;
        while (y < worldSize / 2) {
            this.drawItem(fence, x, y, 0, 1, Math.PI / 2);
            y += fenceWidth!;
        }

        y = -origDrawPointConst;
        x = origDrawPointVariable;
        while (x < worldSize / 2) {
            this.drawItem(fence, x, y, 0);
            x += fenceWidth!;
        }

        y = origDrawPointConst;
        x = origDrawPointVariable;
        while (x < worldSize / 2) {
            this.drawItem(fence, x, y, 0);
            x += fenceWidth!;
        }

    }

    // ITEMS MANAGEMENT

    private loadItems(chunkX: number, chunkY: number) {
        Biomes.biomes[this.currentBiome].items.forEach((item) => {
            this.loadItemType(item, chunkX, chunkY);
        });
    }

    private loadItemType(item: BiomeItem, chunkX: number, chunkY: number): void {
        let drawCount = item.drawCount;

        if (item.boostDrawCount && item.boostDrawCountRate) {
            if (this.randBoolItem(item.boostDrawCountRate, item.asset + this.getBchunk(chunkX, chunkY), 0, 0)) {
                drawCount = item.boostDrawCount;
            }
        }

        const drawRate = this.getDrawRate(item.asset, drawCount);

        const bound = this.chunckSize / 2;
        let xIndex = -bound;

        while (xIndex < bound) {

            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex < bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                const rAsset = AssetManager.getAsset(this.currentBiome, item.asset, item.asset + absX + absY);

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }

                if (rAsset.type === 'item' && absX < Params.playerInitX + this.spawnNoDrawZone && absX > Params.playerInitX - this.spawnNoDrawZone && absY < Params.playerInitY + this.spawnNoDrawZone && absY > Params.playerInitY - this.spawnNoDrawZone) {
                    continue;
                }

                if (!this.loadedChuncksItems[`${chunkX}/${chunkY}`]) {
                    return;
                }

                if (this.randBoolItem(drawRate, `${rAsset.name}draw`, absX, absY)) {
                    this.renderQueue.push(() => {
                        if (!this.loadedChuncksItems[`${chunkX}/${chunkY}`]) {
                            return;
                        }
                        if (rAsset instanceof GG3DAsset && rAsset.type === 'item') {
                            const item = this.drawItemWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: item, asset: rAsset });
                            }
                        }
                        else if (rAsset instanceof GGSpriteAsset && rAsset.type === 'sprite') {
                            const item = this.drawSpriteWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChuncksItems[`${chunkX}/${chunkY}`].sprites.push({ sprite: item, asset: rAsset });
                            }
                        }
                    });
                }
            }
            xIndex += biggestAsset;
        }
    }

    /// DRAWING

    private drawItem(asset: GG3DAsset, x: number, y: number, z: number, sizeRatio: number = 1, rotate: number = 0): InstancedMesh | undefined {
        const item = asset.mesh?.createInstance(asset.name + this.itemCnt);

        this.itemCnt++;

        if (!item) {
            return;
        }

        const ratio = asset.scale * sizeRatio;
        item.scaling = new Vector3(ratio, ratio, ratio);

        item.position = new Vector3(x, z, y);
        if (rotate > 0) {
            item.rotation = new Vector3(0, rotate, 0);
        }

        item.checkCollisions = !asset.ignoreCollisions;
        item.isPickable = asset.isPickable;

        if (!asset.disableShadow) {
            this.lightingManager.shadowGenerator.addShadowCaster(item);
        }

        App.scene.addMesh(item);
        return item;
    }

    private drawItemWithDeviation(asset: GG3DAsset, x: number, y: number, chunkX: number, chunkY: number): InstancedMesh | undefined {
        let deviationX = 0;
        let deviationY = 0;
        let deviationZ = 0;

        let sizeRatio = 1;
        let rotation = 0;

        let itemHeight = asset.mesh!.getBoundingInfo().boundingBox.maximumWorld.y * asset.scale;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = this.getDeviationX(asset, x, y);
                deviationY = this.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.getSizeRatio(asset, x, y);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.getDeviationZ(asset, x, y, itemHeight, sizeRatio);
            }
            rotation = this.randNumberItem(`${asset.name}rotate`, x, y) / 100 * Math.PI * 2;
        }

        x = x + deviationX;
        y = y + deviationY;

        itemHeight = itemHeight * sizeRatio;

        const z = itemHeight - deviationZ;

        if (x < chunkX - this.chunckSize / 2) {
            x = chunkX - this.chunckSize / 2;
        }
        else if (x > chunkX + this.chunckSize / 2) {
            x = chunkX + this.chunckSize / 2;
        }

        if (y < chunkY - this.chunckSize / 2) {
            y = chunkY - this.chunckSize / 2;
        }
        else if (y > chunkY + this.chunckSize / 2) {
            y = chunkY + this.chunckSize / 2;
        }

        const res = this.drawItem(asset, x, y, z, sizeRatio, rotation);

        if (!res) {
            return undefined;
        }

        res.computeWorldMatrix();

        if (!this.isSpaceAvailable(res, asset, x, y)) {
            this.deleteMeshFromScene(res);
            return undefined;
        }

        return res;
    }

    private drawSprite(asset: GGSpriteAsset, x: number, y: number, z: number, sizeRatio: number, rotate: number = 0, invert: boolean): Sprite | undefined {
        const sprite = new Sprite(asset.name + this.itemCnt, asset.sprite);

        this.itemCnt++;

        if (!sprite) {
            return;
        }

        sprite.size = asset.height * asset.scale * sizeRatio;
        sprite.position = new Vector3(x, sprite.size / 2 + z, y);
        sprite.angle = rotate;
        sprite.invertU = invert;

        return sprite;
    }

    private drawSpriteWithDeviation(asset: GGSpriteAsset, x: number, y: number, chunkX: number, chunkY: number): Sprite | undefined {
        let deviationX = 0;
        let deviationY = 0;
        let deviationZ = -1;

        let sizeRatio = 1;
        let rotation = 0;
        let invert = false;


        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = this.getDeviationX(asset, x, y);
                deviationY = this.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.getSizeRatio(asset, x, y, false);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.getDeviationZ(asset, x, y, asset.height, sizeRatio);
            }
            rotation = (this.randNumberItem(`${asset.name}rotate`, x, y) - 50) / 50 * (Math.PI / 16);
            invert = this.randBoolItem(asset.sizeRatio, `${asset.name}invert`, x, y);
        }

        x = x + deviationX;
        y = y + deviationY;

        if (x < chunkX - this.chunckSize / 2 || x > chunkX + this.chunckSize / 2) {
            x = x - 2 * deviationX;
        }

        if (y < chunkY - this.chunckSize / 2 || y > chunkY + this.chunckSize / 2) {
            y = y - 2 * deviationY;
        }

        if (!WorldUtils.isInWorldBounds(x, y)) {
            return undefined;
        }

        const res = this.drawSprite(asset, x, y, deviationZ, sizeRatio, rotation, invert);

        if (!res) {
            return undefined;
        }

        return res;
    }

    // UTILS

    private isSpaceAvailable(mesh: AbstractMesh, asset: GG3DAsset, x: number, y: number): boolean {
        let res = true;
        const chunk = this.getChunk(x, y);
        const items = this.loadedChuncksItems[chunk]?.meshes;

        if (!WorldUtils.isInWorldBounds(x, y)) {
            return false;
        }

        if (!items) {
            return true;
        }

        items.some((item) => {
            if (item.asset.type === 'ground' || item.asset.name === asset.name) {
                return false;
            }
            if (mesh.intersectsMesh(item.mesh as InstancedMesh, true)) {
                res = false;
                return true;
            }
        });

        return res;
    }

    private getDrawRate(type: BiomeAssetType, drawCount: number): number {
        const mesh = AssetManager.getFirstAsset(this.currentBiome, type);
        const maxDraw = (1000 * 1000) / (mesh.safeZone * mesh.safeZone);
        return drawCount / maxDraw;
    }

    private deleteMeshFromScene(mesh: AbstractMesh) {
        App.scene.removeMesh(mesh);
        mesh.dispose();
        mesh = null as never;
    }

    private deleteSpriteFromScene(sprite: Sprite) {
        sprite.dispose();
        sprite = null as never;
    }

    // DEVIATION FUNCTIONS

    private getDeviationX(asset: GGAsset, x: number, y: number): number {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    private getDeviationY(asset: GGAsset, x: number, y: number): number {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    private getDeviationZ(asset: GGAsset, x: number, y: number, height: number, sizeRatio: number): number {
        return height * sizeRatio * asset.maxVerticalDisplacement * (this.randNumberItem(`${asset.name}deviationZ`, x, y)) / 100;
    }

    private getSizeRatio(asset: GGAsset, x: number, y: number, useHugeFactor: boolean = true): number {
        let sizeRatio = asset.sizeRatio * (this.randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 50;

        if (sizeRatio < 0) {
            sizeRatio = 1 / (1 - sizeRatio);
        }
        else {
            sizeRatio = 1 + sizeRatio;
        }

        if (useHugeFactor && this.randNumberItem(`${asset.name}huge`, x, y) < Params.hugeSizeChance / 10) {
            sizeRatio = sizeRatio * Params.hugeSizeRatio;
        }

        return sizeRatio;
    }

    // RAND FUNCTIONS
    private randBoolItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }
}
