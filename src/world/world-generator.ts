import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { InstancedMesh } from '@babylonjs/core/Meshes/instancedMesh';
import { Sprite } from '@babylonjs/core/Sprites/sprite';
import { App } from '../core/app';
import { Params } from '../core/params';
import { EmeniesManager } from '../game/enemies';
import { Enemy } from '../game/enemy';
import { EnemyTypes } from '../game/enemy-types';
import { BiomeItem, BiomeType, EnemySpawn, LoadedMesh, LoadedSprite, PreLoadedItem, ZoneItem, ZoneType } from '../models/interfaces';
import { Random } from '../utils/random';
import { WorldUtils } from '../utils/world-utils';
import { AssetManager } from './assets';
import { Biomes } from './biomes';
import { GG3DAsset, GGAsset, GGSpriteAsset } from './GGAsset';
import { LightingManager } from './lighting';

type ItemLoadRequest =
    | { kind: 'biome', item: BiomeItem, noSprite: boolean }
    | { kind: 'zone', item: ZoneItem, zone: ZoneType };

export class WorldGenerator {

    private itemCnt = 0;

    private readonly enableDeviation = true;

    private readonly chunckSize = Params.chunckSize;
    private readonly bchunckSize = Params.bchunckSize;
    private readonly spawnNoDrawZone = Params.spawnNoDrawZone;
    private readonly itemLoadBatchSize = Params.itemLoadBatchSize;

    private readonly currentBiome = BiomeType.forest;

    private readonly zonesChuncks: { [key in ZoneType]: string[] } = {
        [ZoneType.town]: []
    };
    private readonly zoneTypes: readonly ZoneType[] = [ZoneType.town];

    private initPlayerChunk: string;
    private currentChunk: string | null = null;

    private readonly loadedChuncksItems: { [key: string]: { meshes: LoadedMesh[], sprites: LoadedSprite[] } } = {};
    private readonly preLoadedChuncksItems: { [key: string]: { meshes: PreLoadedItem[], sprites: PreLoadedItem[] } } = {};
    private readonly renderQueue: Array<() => void> = [];

    private readonly lightingManager = LightingManager.getInstance();
    private readonly enemiesManager = EmeniesManager.getInstance();

    private static instance: WorldGenerator;
    static getInstance(): WorldGenerator {
        if (!this.instance) {
            this.instance = new WorldGenerator();
        }
        return this.instance;
    }

    private constructor() {
        this.initPlayerChunk = this.getChunk(Params.playerInitX, Params.playerInitY);
        this.initRenderLoopExtras();
        this.initZonesChuncks();
        this.loadFences();
    }

    private initialRenderStarted = false;
    private initialRenderEnded = false;
    private initialRenderSuccessiveFrameWith0ItemToRender = 0;
    private initRenderLoopExtras() {
        App.scene.onBeforeRenderObservable.add(() => {
            for (let i = 0; i < this.itemLoadBatchSize; i++) {
                if (this.renderQueue.length === 0) {
                    if (!this.initialRenderEnded && this.initialRenderStarted) {
                        this.initialRenderSuccessiveFrameWith0ItemToRender++;
                        if (this.initialRenderSuccessiveFrameWith0ItemToRender > Params.framesWithoutDraw) {
                            App.hideLoadingScreenSubject.next();
                            App.hideLoadingScreenSubject.complete();
                            this.initialRenderEnded = true;
                        }
                    }
                    break;
                }
                if (!this.initialRenderEnded) {
                    this.initialRenderStarted = true;
                    this.initialRenderSuccessiveFrameWith0ItemToRender = 0;
                }
                const renderItem = this.renderQueue.shift();
                if (renderItem) {
                    renderItem();
                }
            }

            const time = performance.now() * 0.002; // Temps simulé (ralenti)
            const waveSpeed = 0.4; // Vitesse de propagation de l'onde
            const waveAmplitude = 0.05; // Amplitude du mouvement
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

    private initZonesChuncks() {
        this.zoneTypes.forEach((zone) => {
            for (let i = 0; i < Params.zoneCount[zone]; i++) {
                const chunk = this.getZoneRandomChunk(zone, i);
                this.zonesChuncks[zone].push(chunk);
            }
        });
    }

    private getZoneForChunk(chunk: string): ZoneType | null {
        for (const zone of this.zoneTypes) {
            if (this.zonesChuncks[zone].includes(chunk)) {
                return zone;
            }
        }
        return null;
    }

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

    private getChunksToLoad(currentChunk: string) {
        const [currentChuckX, currentChuckY] = currentChunk.split('/').map((val) => parseInt(val));
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

        const chuncks = this.getChunksToLoad(currentChunk);

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

            this.enemiesManager.deleteEnemyChunk(chunk);

            this.loadedChuncksItems[chunk].meshes.forEach((item) => {
                this.deleteMeshFromScene(item.mesh);
            });

            this.loadedChuncksItems[chunk].sprites.forEach((item) => {
                this.deleteSpriteFromScene(item.sprite);
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
            this.loadGround(x, y, AssetManager.getWorldAsset('ocean'));
            return;
        }
        this.loadGround(x, y);
        this.loadPreLoadedItems(x, y);

        const zone = this.getZoneForChunk(chunk);
        this.loadItems(x, y, zone);
        this.loadEnemies(x, y, zone);
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

                const rAsset = asset ?? AssetManager.getAsset(this.currentBiome, assetType, assetType + absX + absY);

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
        const fence = AssetManager.getWorldAsset('fence');

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
        if (!this.preLoadedChuncksItems[chunk]) {
            return;
        }

        this.preLoadedChuncksItems[chunk].meshes.forEach((item) => {
            this.renderQueue.push(() => {
                const mesh = this.drawItem(item.asset, item.x, item.y, item.z, item.sizeRatio, item.rotate);
                if (mesh) {
                    this.loadedChuncksItems[chunk].meshes.push({ mesh, asset: item.asset });
                }
            });
        });
    }

    private loadItems(chunkX: number, chunkY: number, zone: ZoneType | null = null) {
        if (zone) {
            Biomes.zones[zone].items.forEach((item) => {
                this.loadItemType({ kind: 'zone', item, zone }, chunkX, chunkY);
            });
        }

        Biomes.biomes[this.currentBiome].items.forEach((item) => {
            this.loadItemType({ kind: 'biome', item, noSprite: !!zone }, chunkX, chunkY);
        });
    }

    private loadItemType(request: ItemLoadRequest, chunkX: number, chunkY: number): void {
        const item = request.item;
        let drawCount = item.drawCount;

        if (request.kind === 'zone' && request.item.chunkPlacement) {
            const placement = request.item.chunkPlacement;
            const rAsset = AssetManager.getZoneAsset(request.zone, request.item.asset, request.item.asset + chunkX + chunkY + request.zone + chunkX + chunkY);
            const nItem = this.drawItem(rAsset, chunkX + placement.x, chunkY + placement.y, placement.z);
            if (nItem) {
                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: nItem, asset: rAsset });
            }
            return;
        }

        if (request.kind === 'biome' && request.item.boostDrawCount && request.item.boostDrawCountRate) {
            if (this.randBoolItem(request.item.boostDrawCountRate, request.item.asset + this.getBchunk(chunkX, chunkY), 0, 0)) {
                drawCount = request.item.boostDrawCount;
            }
        }

        const drawRate = this.getDrawRate(request, drawCount);

        const bound = this.chunckSize / 2;
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
                        if (rAsset instanceof GG3DAsset && (rAsset.type === 'item' || rAsset.type === 'ground')) {
                            const item = this.drawItemWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                            if (item) {
                                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: item, asset: rAsset });
                            }
                        }
                        else if (rAsset instanceof GGSpriteAsset && rAsset.type === 'sprite' && request.kind === 'biome' && !request.noSprite) {
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

    loadEnemies(chunkX: number, chunkY: number, zone: ZoneType | null = null) {
        if (zone) {
            const enemySpawns = Biomes.zones[zone].enemySpawns;
            if (!enemySpawns) {
                return;
            }
            enemySpawns.forEach((item) => {
                this.loadEnemySpawn(item, chunkX, chunkY);
            });
            return;
        }

        const enemySpawns = Biomes.biomes[this.currentBiome].enemySpawns;
        if (!enemySpawns) {
            return;
        }

        enemySpawns.forEach((item) => {
            this.loadEnemySpawn(item, chunkX, chunkY);
        });
    }

    loadEnemySpawn(item: EnemySpawn, chunkX: number, chunkY: number) {
        const count = this.getSpawnNumber(item.spawnRate, item.enemy, chunkX, chunkY);

        if (count < 1) {
            return;
        }

        let enemySpawned = 0;
        let cnt = 0;

        while (enemySpawned < count) {
            cnt++;

            const coords = this.getRandomPositionInChunk(chunkX, chunkY, item.enemy, cnt);

            if (this.isTooCloseToPlayerSpawn(coords.x, coords.y)) {
                enemySpawned++;
                continue; // Skip if too close to player start
            }

            const asset = AssetManager.getEnemyAsset(item.enemy);
            const enemy = new Enemy(asset, new Vector3(coords.x, 0, coords.y), EnemyTypes[item.enemy]);

            if (this.isSpaceAvailable(enemy.mesh, coords.x, coords.y)) {
                enemySpawned++;
                this.enemiesManager.addEnemy(enemy, `${chunkX}/${chunkY}`, enemySpawned);
            }
            else {
                enemy.delete();
            }
        }
    }

    /// DRAWING

    private addToPreLoadedItems(asset: GG3DAsset, x: number, y: number, z: number, sizeRatio: number = 1, rotate: number = 0): void {
        const chunk = this.getChunk(x, y);
        if (!this.preLoadedChuncksItems[chunk]) {
            this.preLoadedChuncksItems[chunk] = { meshes: [], sprites: [] };
        }

        this.preLoadedChuncksItems[chunk].meshes.push({ asset, x, y, z, sizeRatio, rotate });
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
            App.scene.addMesh(item);
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
                deviationX = this.getDeviationX(asset, x, y);
                deviationY = this.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.getSizeRatio(asset, x, y);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.getDeviationZ(asset, x, y, itemHeight);
            }
            rotation = this.randNumberItem(`${asset.name}rotate`, x, y) / 100 * Math.PI * 2;
        }

        x = x + deviationX;
        y = y + deviationY;

        itemHeight = itemHeight * sizeRatio;

        const z = 0 - deviationZ;

        if (x < chunkX - this.chunckSize / 2) {
            x = x - 2 * deviationX;
        }
        else if (x > chunkX + this.chunckSize / 2) {
            x = x - 2 * deviationX;
        }

        if (y < chunkY - this.chunckSize / 2) {
            y = y - 2 * deviationY;
        }
        else if (y > chunkY + this.chunckSize / 2) {
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
                deviationX = this.getDeviationX(asset, x, y);
                deviationY = this.getDeviationY(asset, x, y);;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = this.getSizeRatio(asset, x, y, false);
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = this.getDeviationZ(asset, x, y, asset.height * sizeRatio);
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

    private isSpaceAvailable(mesh: AbstractMesh, x: number, y: number): boolean {
        let res = true;
        const chunk = this.getChunk(x, y);
        const items = this.loadedChuncksItems[chunk]?.meshes;

        if (!WorldUtils.isInWorldBounds(x, y)) {
            return false;
        }

        const chunck = chunk.split('/').map((val) => parseInt(val));
        if (!WorldUtils.isInChunkBounds(mesh, chunck[0], chunck[1])) {
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
        const maxDraw = (1000 * 1000) / (asset.safeZone * asset.safeZone);
        return drawCount / maxDraw;
    }

    private deleteMeshFromScene(mesh: AbstractMesh) {
        App.scene.removeMesh(mesh);
        mesh.dispose();
    }

    private deleteSpriteFromScene(sprite: Sprite) {
        sprite.dispose();
    }

    // DEVIATION FUNCTIONS

    private getDeviationX(asset: GGAsset, x: number, y: number): number {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    private getDeviationY(asset: GGAsset, x: number, y: number): number {
        return 2 * asset.safeZone * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    private getDeviationZ(asset: GGAsset, x: number, y: number, height: number): number {
        return height * asset.maxVerticalDisplacement * (this.randNumberItem(`${asset.name}deviationZ`, x, y)) / 100;
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

    private getZoneRandomChunk(type: ZoneType, count: number): string {
        const x = Random.randomNumber(`xzone${type}x${count}x${count}x${count}`);
        const y = Random.randomNumber(`yzone${type}y${count}y${count}y${count}`);

        const worldX = x / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;
        const worldY = y / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;

        const chunk = this.getChunk(worldX, worldY);

        if (chunk === this.initPlayerChunk) {
            return this.getZoneRandomChunk(type, count + 1500);
        }

        return chunk;
    }

    private getSpawnNumber(spawnRate: number, name: string, x: number, y: number): number {

        const L = Math.exp(-spawnRate);
        let k = 0;
        let p = 1;

        do {
            k++;
            p *= Random.randomNumber(`spawn${k}${k}${k}${x}${y}${name}${k}${x}${k}${k}`) / 100;
        } while (p > L);
        return k - 1;
    }

    private getRandomPositionInChunk(chunkX: number, chunkY: number, name: string, count: number): { x: number, y: number } {
        const xIndex = Random.randomNumber(`x${count}x${chunkX}x${chunkY}${name}x${count}`) / 100 * this.chunckSize - this.chunckSize / 2;
        const yIndex = Random.randomNumber(`y${count}y${chunkX}y${chunkY}${name}x${count}`) / 100 * this.chunckSize - this.chunckSize / 2;
        return { x: chunkX + xIndex, y: chunkY + yIndex };
    }

    private isTooCloseToPlayerSpawn(x: number, y: number): boolean {
        const distFromPlayerInit = Math.sqrt(
            Math.pow(x - Params.playerInitX, 2) +
            Math.pow(y - Params.playerInitY, 2)
        );

        if (distFromPlayerInit < Params.spawnMinDistanceFromPlayerSpawn) {
            return true;
        }

        return false;
    }
}
