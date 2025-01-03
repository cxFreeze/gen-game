import { AbstractMesh, InstancedMesh, Material, MeshBuilder, Ray, Sprite, Vector3 } from '@babylonjs/core';
import { App } from '../../app';
import { AssetType, BiomeItem, GGA3DAsset, LoadedMesh, LoadedSprite } from '../../interfaces';
import { AssetManager } from './assets';
import { LightingManager } from './lighting';
import { PlayerManager } from './player';
import { WorldManager } from './world';
import { WorldUtils } from './world-utils';

export abstract class WorldGeneration {

    static itemCnt = 0;

    private static enableDeviation = true;

    private static readonly chunckSize = 400;
    private static readonly spawnNoDrawZone = 100;

    private static readonly itemLoadBatchSize = 50;

    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: { meshes: LoadedMesh[], sprites: LoadedSprite[] } } = {};

    private static transparentMeshes = new Set<AbstractMesh>();

    private static renderQueue: Array<() => void> = [];

    static initRenderLoopExtras() {
        App.scene.onBeforeRenderObservable.add((scene) => {
            for (let i = 0; i < this.itemLoadBatchSize; i++) {
                if (this.renderQueue.length === 0) {
                    break;
                }
                this.renderQueue.shift()!();
            }

            if (scene.getFrameId() % 10 === 0) {
                this.setCameraObstacleSemiTransparent();
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

    private static getCurrentChunk() {
        return this.getChunk(WorldManager.worldX, WorldManager.worldY);
    }

    private static getChunk(x: number, y: number) {
        const chuckX = Math.round(x / this.chunckSize) * this.chunckSize;
        const chuckY = Math.round(y / this.chunckSize) * this.chunckSize;
        return `${chuckX}/${chuckY}`;
    }

    private static getChunksToLoad() {
        const [currentChuckX, currentChuckY] = this.currentChunk.split('/').map((val) => parseInt(val));
        const chucks = [];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                chucks.push(`${currentChuckX + i * this.chunckSize}/${currentChuckY + j * this.chunckSize}`);
            }
        }
        return chucks;
    }

    static generateWorld() {
        const currentChunk = this.getCurrentChunk();
        if (currentChunk === this.currentChunk) {
            return;
        }

        this.currentChunk = currentChunk;

        const timeoutDelay = 50;
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

    private static unloadChunk(chunk: string) {
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

    private static loadChunk(chunk: string) {
        if (this.loadedChuncksItems[chunk]) {
            return;
        }
        this.loadedChuncksItems[chunk] = { meshes: [], sprites: [] };
        const [x, y] = chunk.split('/').map((val) => parseInt(val));

        this.loadGround(x, y);
        this.loadItems(x, y);
    }

    private static loadGround(chunkX: number, chunkY: number): void {
        const asset = WorldManager.biomes[WorldManager.currentBiome].ground;

        const bound = this.chunckSize / 2;
        let xIndex = -bound;

        while (xIndex <= bound) {

            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex <= bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                const rAsset = AssetManager.getAsset(WorldManager.currentBiome, asset, asset + absX + absY);

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }

                const ground = MeshBuilder.CreateGround('ground', { width: rAsset.width, height: rAsset.height }, App.scene);

                ground.material = rAsset.material as Material;
                ground.position = new Vector3(absX, 0, absY);
                ground.receiveShadows = true;

                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: ground, asset: rAsset });
            }
            xIndex += biggestAsset;
        }
    }

    // ITEMS MANAGEMENT

    private static loadItems(chunkX: number, chunkY: number) {
        WorldManager.biomes[WorldManager.currentBiome].items.forEach((item) => {
            this.loadItemType(item, chunkX, chunkY);
        });
    }

    private static loadItemType(item: BiomeItem, chunkX: number, chunkY: number): void {
        let drawCount = item.drawCount;

        if (item.boostDrawCount && item.boostDrawCountRate) {
            if (WorldUtils.randBoolItem(item.boostDrawCountRate, item.asset, chunkX, chunkY)) {
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

                const rAsset = AssetManager.getAsset(WorldManager.currentBiome, item.asset, item.asset + absX + absY);

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }

                if (rAsset.type === 'item' && absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (!this.loadedChuncksItems[`${chunkX}/${chunkY}`]) {
                    return;
                }

                if (WorldUtils.randBoolItem(drawRate, `${rAsset.name}draw`, absX, absY)) {
                    this.renderQueue.push(() => {
                        if (!this.loadedChuncksItems[`${chunkX}/${chunkY}`]) {
                            return;
                        }
                        if (rAsset.type === 'item') {
                            const item = this.drawItemWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: item, asset: rAsset });
                            }
                        }
                        else if (rAsset.type === 'sprite') {
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

    private static drawItem(asset: GGA3DAsset, x: number, y: number, z: number, sizeRatio: number, rotate: number = 0): InstancedMesh | undefined {
        const item = asset.mesh?.createInstance(asset.name + this.itemCnt);

        this.itemCnt++;

        if (!item) {
            return;
        }

        item.receiveShadows = true;

        const ratio = asset.scale * sizeRatio;
        item.scaling = new Vector3(ratio, ratio, ratio);

        item.position = new Vector3(x, z, y);
        if (rotate > 0) {
            item.rotation = new Vector3(0, rotate, 0);
        }

        item.checkCollisions = !asset.ignoreCollisions;

        LightingManager.shadowGenerator.addShadowCaster(item);
        item.receiveShadows = true;

        App.scene.addMesh(item);
        return item;
    }

    private static drawItemWithDeviation(asset: GGA3DAsset, x: number, y: number, chunkX: number, chunkY: number): InstancedMesh | undefined {
        let deviationX = 0;
        let deviationY = 0;
        let deviationZ = 0;

        let sizeRatio = 1;
        let rotation = 0;

        let itemHeight = asset.mesh!.getBoundingInfo().boundingBox.maximumWorld.y * asset.scale;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = WorldUtils.getDeviationX(asset, x, y);
                deviationY = WorldUtils.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = WorldUtils.getSizeRatio(asset, x, y);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = WorldUtils.getDeviationZ(asset, x, y, itemHeight, sizeRatio);
            }
            rotation = WorldUtils.randNumberItem(`${asset.name}rotate`, x, y) / 100 * Math.PI * 2;
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

    private static drawSprite(asset: GGA3DAsset, x: number, y: number, z: number, sizeRatio: number, rotate: number = 0, invert: boolean): Sprite | undefined {
        const sprite = new Sprite(asset.name + this.itemCnt, asset.sprite!);

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

    private static drawSpriteWithDeviation(asset: GGA3DAsset, x: number, y: number, chunkX: number, chunkY: number): Sprite | undefined {
        let deviationX = 0;
        let deviationY = 0;
        let deviationZ = -1;

        let sizeRatio = 1;
        let rotation = 0;
        let invert = false;


        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = WorldUtils.getDeviationX(asset, x, y);
                deviationY = WorldUtils.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = WorldUtils.getSizeRatio(asset, x, y, false);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = WorldUtils.getDeviationZ(asset, x, y, asset.height, sizeRatio);
            }
            rotation = (WorldUtils.randNumberItem(`${asset.name}rotate`, x, y) - 50) / 50 * (Math.PI / 16);
            invert = WorldUtils.randBoolItem(asset.sizeRatio, `${asset.name}invert`, x, y);
        }

        x = x + deviationX;
        y = y + deviationY;

        if (x < chunkX - this.chunckSize / 2 || x > chunkX + this.chunckSize / 2) {
            x = x - 2 * deviationX;
        }

        if (y < chunkY - this.chunckSize / 2 || y > chunkY + this.chunckSize / 2) {
            y = y - 2 * deviationY;
        }

        const res = this.drawSprite(asset, x, y, deviationZ, sizeRatio, rotation, invert);

        if (!res) {
            return undefined;
        }

        return res;
    }

    // UTILS

    private static isSpaceAvailable(mesh: AbstractMesh, asset: GGA3DAsset, x: number, y: number): boolean {
        let res = true;
        const chunk = this.getChunk(x, y);
        const items = this.loadedChuncksItems[chunk]?.meshes;

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

    private static getDrawRate(type: AssetType, drawCount: number): number {
        const mesh = AssetManager.getFirstAsset(WorldManager.currentBiome, type);
        const maxDraw = (1000 * 1000) / (mesh.safeZone * mesh.safeZone);
        return drawCount / maxDraw;
    }

    private static deleteMeshFromScene(mesh: AbstractMesh) {
        App.scene.removeMesh(mesh);
        mesh.dispose();
        mesh = null as never;
    }

    private static deleteSpriteFromScene(sprite: Sprite) {
        sprite.dispose();
        sprite = null as never;
    }

    private static setCameraObstacleSemiTransparent() {
        const ray = new Ray(WorldManager.camera.position, PlayerManager.playerMesh.position.subtract(WorldManager.camera.position).normalize());

        const hitResults = App.scene.multiPickWithRay(ray, (mesh) => mesh.name !== 'player');

        const currentMeshes = new Set();
        if (hitResults) {
            for (const hit of hitResults) {
                if (!hit.pickedPoint || hit.pickedPoint.y < 20) {
                    continue;
                }
                const mesh = hit.pickedMesh;
                currentMeshes.add(mesh);

                if (!this.transparentMeshes.has(mesh!)) {
                    const newMesh = WorldUtils.setMeshTransparent(mesh!);
                    this.transparentMeshes.add(mesh!);
                    if (newMesh) {
                        LightingManager.shadowGenerator.addShadowCaster(newMesh);
                    }
                }
            }
        }

        for (const mesh of this.transparentMeshes) {
            if (!currentMeshes.has(mesh)) {
                WorldUtils.resetMeshTransparency(mesh);
                this.transparentMeshes.delete(mesh);
            }
        }
    }
}
