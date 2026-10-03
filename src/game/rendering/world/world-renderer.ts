import type { WorldLayout, ItemLoadRequest } from '../../gameplay/world/world-layout';
import { renderConfig } from '../scene/render-config';
import { worldConfig } from '../../gameplay/world/world-config';
import { isMeshInChunkBounds } from './chunk-bounds';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { GameRuntime } from '../../runtime/game-runtime';
import type { LoadedMesh, LoadedSprite, PreLoadedItem } from './chunk-types.interface';
import { AssetManager } from '../assets/assets';
import { GG3DAsset, GGAsset, GGSpriteAsset } from '../assets/gg-asset';
import { LightingManager } from '../lighting/lighting';
import { RenderQueue } from './render-queue';


export class WorldRenderer {

    private itemCnt = 0;

    private readonly enableDeviation = true;

    private readonly chunkSize = worldConfig.chunkSize;

    private get currentBiome() {
        return this.placement.biome;
    }

    private readonly loadedChunksItems: { [key: string]: { meshes: LoadedMesh[], sprites: LoadedSprite[] } } = {};
    private readonly preLoadedChunksItems: { [key: string]: { meshes: PreLoadedItem[], sprites: PreLoadedItem[] } } = {};
    private readonly renderQueue = new RenderQueue(renderConfig.itemLoadBatchSize, renderConfig.framesWithoutDraw);
    private readonly lightingManager = LightingManager.getInstance();

    private static instance: WorldRenderer | undefined;
    static dispose() {
        if (this.instance) {
            this.instance.renderQueue.clear();
        }
        this.instance = undefined;
    }
    static getInstance(): WorldRenderer {
        if (!this.instance) {
            throw new Error('The world renderer is not initialized');
        }
        return this.instance;
    }

    static initialize(layout: WorldLayout) {
        this.instance = new WorldRenderer(layout);
    }

    private constructor(private readonly placement: WorldLayout) {
        this.initRenderLoopExtras();

        this.loadFences();
    }

    private initRenderLoopExtras() {
        GameRuntime.scene.onBeforeRenderObservable.add(() => {
            if (this.renderQueue.processFrame()) {
                GameRuntime.finishLoading();
            }

            const time = performance.now() * 0.002; // Temps simulé (ralenti)
            const waveSpeed = 0.4; // Vitesse de propagation de l'onde
            const waveAmplitude = 0.05; // Amplitude du mouvement
            const waveFrequency = 10; // Fréquence spatiale

            // sprite animation
            Object.keys(this.loadedChunksItems).forEach((chunk) => {
                this.loadedChunksItems[chunk]?.sprites.forEach((item) => {
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


    // Chunk MANAGEMENT

    unloadChunk(chunk: string, onUnloaded: () => void, shouldUnload: () => boolean) {
        if (!this.loadedChunksItems[chunk]) {
            onUnloaded();
            return;
        }

        this.renderQueue.enqueue(() => {
            if (!shouldUnload()) {
                return;
            }
            if (!this.loadedChunksItems[chunk]) {
                onUnloaded();
                return;
            }

            this.loadedChunksItems[chunk].meshes.forEach((item) => {
                this.deleteMeshFromScene(item.mesh);
            });

            this.loadedChunksItems[chunk].sprites.forEach((item) => {
                this.deleteSpriteFromScene(item.sprite);
            });
            delete this.loadedChunksItems[chunk];
            onUnloaded();
        });
    }

    loadChunk(chunk: string) {
        if (this.loadedChunksItems[chunk]) {
            return;
        }
        this.loadedChunksItems[chunk] = { meshes: [], sprites: [] };
        const [x, y] = chunk.split('/').map((val) => parseInt(val));

        if (!this.placement.isInWorldBounds(x, y)) {
            this.loadGround(x, y, AssetManager.getWorldAsset('ocean'));
            return;
        }
        this.loadGround(x, y);
        this.loadPreLoadedItems(x, y);

        this.loadItems(x, y);
    }

    private loadGround(chunkX: number, chunkY: number, asset: GG3DAsset | null = null): void {
        const assetType = this.placement.ground;

        const bound = this.chunkSize / 2;
        let xIndex = -bound;

        while (xIndex < bound) {
            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex < bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                const rAsset = asset ?? AssetManager.getAsset(this.currentBiome, assetType, assetType + absX + absY);

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }


                const ground = rAsset.mesh.createInstance(rAsset.name + this.itemCnt);
                this.itemCnt++;


                ground.position = new Vector3(absX + rAsset.width / 2, 0, absY + rAsset.height / 2);
                this.loadedChunksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: ground, asset: rAsset });
            }
            xIndex += biggestAsset;
        }
    }

    private loadFences() {
        const fence = AssetManager.getWorldAsset('fence');

        const worldSize = worldConfig.safeDrawWorldSize + 20;

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
            this.addToPreLoadedItems(fence, x, y, 0, 1, Math.PI / 2);
            y += fenceWidth;
        }

        y = origDrawPointVariable;
        x = origDrawPointConst;
        while (y < worldSize / 2) {
            this.addToPreLoadedItems(fence, x, y, 0, 1, Math.PI / 2);
            y += fenceWidth;
        }

        y = -origDrawPointConst;
        x = origDrawPointVariable;
        while (x < worldSize / 2) {
            this.addToPreLoadedItems(fence, x, y, 0);
            x += fenceWidth;
        }

        y = origDrawPointConst;
        x = origDrawPointVariable;
        while (x < worldSize / 2) {
            this.addToPreLoadedItems(fence, x, y, 0);
            x += fenceWidth;
        }

    }

    // ITEMS MANAGEMENT

    private loadPreLoadedItems(chunkX: number, chunkY: number) {
        const chunk = `${chunkX}/${chunkY}`;
        if (!this.preLoadedChunksItems[chunk]) {
            return;
        }

        this.preLoadedChunksItems[chunk].meshes.forEach((item) => {
            this.renderQueue.enqueue(() => {
                const mesh = this.drawItem(item.asset, item.x, item.y, item.z, item.sizeRatio, item.rotate);
                if (mesh) {
                    this.loadedChunksItems[chunk].meshes.push({ mesh, asset: item.asset });
                }
            });
        });
    }

    private loadItems(chunkX: number, chunkY: number) {
        for (const request of this.placement.getItemsForChunk(chunkX, chunkY)) {
            this.loadItemType(request, chunkX, chunkY);
        }
    }

    private loadItemType(request: ItemLoadRequest, chunkX: number, chunkY: number): void {
        const drawCount = this.placement.getDrawCount(request, chunkX, chunkY);

        if (request.kind === 'zone' && request.item.chunkPlacement) {
            const placement = request.item.chunkPlacement;
            const rAsset = AssetManager.getZoneAsset(request.zone, request.item.asset, request.item.asset + chunkX + chunkY + request.zone + chunkX + chunkY);
            const nItem = this.drawItem(rAsset, chunkX + placement.x, chunkY + placement.y, placement.z);
            if (nItem) {
                this.loadedChunksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: nItem, asset: rAsset });
            }
            return;
        }

        const drawRate = this.getDrawRate(request, drawCount);

        const bound = this.chunkSize / 2;
        let xIndex = -bound;

        while (xIndex < bound) {

            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex < bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                let rAsset: GGAsset;

                if (request.kind === 'zone') {
                    rAsset = AssetManager.getZoneAsset(request.zone, request.item.asset, request.item.asset + absX + absY + request.zone);
                }
                else {
                    rAsset = AssetManager.getAsset(this.currentBiome, request.item.asset, request.item.asset + absX + absY);
                }

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }

                if (rAsset.type === 'item' && this.placement.isInSpawnClearance(absX, absY)) {
                    continue;
                }

                if (!this.loadedChunksItems[`${chunkX}/${chunkY}`]) {
                    return;
                }

                if (this.placement.randBoolItem(drawRate, `${rAsset.name}draw`, absX, absY)) {
                    this.renderQueue.enqueue(() => {
                        if (!this.loadedChunksItems[`${chunkX}/${chunkY}`]) {
                            return;
                        }
                        if (rAsset instanceof GG3DAsset && (rAsset.type === 'item' || rAsset.type === 'ground')) {
                            const item = this.drawItemWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChunksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: item, asset: rAsset });
                            }
                        }
                        else if (rAsset instanceof GGSpriteAsset && rAsset.type === 'sprite' && request.kind === 'biome' && !request.noSprite) {
                            const item = this.drawSpriteWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChunksItems[`${chunkX}/${chunkY}`].sprites.push({ sprite: item, asset: rAsset });
                            }
                        }
                    });
                }
            }
            xIndex += biggestAsset;
        }
    }

    /// DRAWING

    private addToPreLoadedItems(asset: GG3DAsset, x: number, y: number, z: number, sizeRatio: number = 1, rotate: number = 0): void {
        const chunk = this.placement.getChunk(x, y);
        if (!this.preLoadedChunksItems[chunk]) {
            this.preLoadedChunksItems[chunk] = { meshes: [], sprites: [] };
        }

        this.preLoadedChunksItems[chunk].meshes.push({ asset, x, y, z, sizeRatio, rotate });
    }

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
            item.rotation = item.rotation.add(new Vector3(0, rotate, 0));
        }
        else {
            item.rotation = item.rotation.add(new Vector3(0, asset.rotation, 0));
        }

        item.checkCollisions = asset.mesh.checkCollisions;
        item.isPickable = asset.isPickable;
        item.alwaysSelectAsActiveMesh = false;

        if (asset.collider) {
            const collider = asset.collider.createInstance(`${asset.name}collider${this.itemCnt}`);
            collider.parent = item;
            collider.isVisible = false;
            collider.isPickable = false;
            collider.checkCollisions = true;
            collider.alwaysSelectAsActiveMesh = false;
        }

        if (!asset.disableShadow) {
            this.lightingManager.shadowGenerator.addShadowCaster(item);
        }

        if (item) {
            item.computeWorldMatrix(true);
            item.doNotSyncBoundingInfo = true;
            GameRuntime.scene.addMesh(item);
        }

        return item;
    }

    private drawItemWithDeviation(asset: GG3DAsset, x: number, y: number, chunkX: number, chunkY: number): InstancedMesh | undefined {
        let deviationX = 0;
        let deviationY = 0;
        let deviationZ = 0;

        let sizeRatio = 1;
        let rotation = 0;

        let itemHeight = asset.sizeY * asset.scale;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = this.placement.getDeviationX(asset, x, y);
                deviationY = this.placement.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.placement.getSizeRatio(asset, x, y);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.placement.getDeviationZ(asset, x, y, itemHeight);
            }
            rotation = this.placement.randNumberItem(`${asset.name}rotate`, x, y) / 100 * Math.PI * 2;
        }

        x = x + deviationX;
        y = y + deviationY;

        itemHeight = itemHeight * sizeRatio;

        const z = 0 - deviationZ;

        if (x < chunkX - this.chunkSize / 2) {
            x = x - 2 * deviationX;
        }
        else if (x > chunkX + this.chunkSize / 2) {
            x = x - 2 * deviationX;
        }

        if (y < chunkY - this.chunkSize / 2) {
            y = y - 2 * deviationY;
        }
        else if (y > chunkY + this.chunkSize / 2) {
            y = y - 2 * deviationY;
        }

        const res = this.drawItem(asset, x, y, z, sizeRatio, rotation);

        if (!res) {
            return undefined;
        }

        if (!this.isSpaceAvailable(res, x, y)) {
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
                deviationX = this.placement.getDeviationX(asset, x, y);
                deviationY = this.placement.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.placement.getSizeRatio(asset, x, y, false);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.placement.getDeviationZ(asset, x, y, asset.height * sizeRatio);
            }
            rotation = (this.placement.randNumberItem(`${asset.name}rotate`, x, y) - 50) / 50 * (Math.PI / 16);
            invert = this.placement.randBoolItem(asset.sizeRatio, `${asset.name}invert`, x, y);
        }

        x = x + deviationX;
        y = y + deviationY;

        if (x < chunkX - this.chunkSize / 2 || x > chunkX + this.chunkSize / 2) {
            x = x - 2 * deviationX;
        }

        if (y < chunkY - this.chunkSize / 2 || y > chunkY + this.chunkSize / 2) {
            y = y - 2 * deviationY;
        }

        if (!this.placement.isInWorldBounds(x, y)) {
            return undefined;
        }

        const res = this.drawSprite(asset, x, y, deviationZ, sizeRatio, rotation, invert);

        if (!res) {
            return undefined;
        }

        return res;
    }

    // UTILS

    isSpaceAvailable(mesh: AbstractMesh, x: number, y: number): boolean {
        let res = true;
        const chunk = this.placement.getChunk(x, y);
        const items = this.loadedChunksItems[chunk]?.meshes;

        if (!this.placement.isInWorldBounds(x, y)) {
            return false;
        }

        const chunkPosition = chunk.split('/').map((val) => parseInt(val));
        if (!isMeshInChunkBounds(mesh, chunkPosition[0], chunkPosition[1], worldConfig.chunkSize)) {
            return false;
        }

        if (!items) {
            return true;
        }

        items.some((item) => {
            if (item.asset.type === 'ground') {
                return false;
            }
            if (mesh.intersectsMesh(item.mesh, true)) {
                res = false;
                return true;
            }
        });

        return res;
    }

    private getDrawRate(request: ItemLoadRequest, drawCount: number): number {
        let asset: GGAsset;
        if (request.kind === 'zone') {
            asset = AssetManager.getFirstZoneAsset(request.zone, request.item.asset);
        }
        else {
            asset = AssetManager.getFirstAsset(this.currentBiome, request.item.asset);
        }
        return this.placement.getDrawRate(drawCount, asset.safeZone);
    }

    private deleteMeshFromScene(mesh: AbstractMesh) {
        GameRuntime.scene.removeMesh(mesh);
        mesh.dispose();
    }

    private deleteSpriteFromScene(sprite: Sprite) {
        sprite.dispose();
    }

}
