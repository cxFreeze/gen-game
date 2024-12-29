import { AbstractMesh, Animation, CubicEase, DirectionalLight, EasingFunction, GroundMesh, HemisphericLight, InstancedMesh, Material, MeshBuilder, Scene, ShadowGenerator, Sprite, UniversalCamera, Vector3 } from '@babylonjs/core';
import { timer } from 'rxjs';
import { AssetManager, AssetType, BiomeType, GGA3DAsset } from './assets.js';
import { PlayerManager } from './player.js';
import { WorldUtils } from './world-utils.js';


interface Biome {
    ground: AssetType;
    items: BiomeItem[];
}

interface BiomeItem { asset: AssetType, drawCount: number, boostDrawCount?: number, boostDrawCountRate?: number };

interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GGA3DAsset;
}

interface LoadedSprite {
    sprite: Sprite;
    asset: GGA3DAsset;
}

export abstract class WorldManager {
    static scene: Scene;
    static shadowGenerator: ShadowGenerator;

    static cnt = 0;

    private static enableDeviation = true;

    private static readonly chunckSize = 400;
    private static readonly spawnNoDrawZone = 100;

    private static readonly itemLoadBatchSize = 50;

    static worldX: number = 0;
    static worldY: number = 0;

    private static camera: UniversalCamera;
    private static cameraX: number = 0;
    private static cameraY: number = 220;
    private static cameraZ: number = -200;

    private static initCameraY: number = 40;
    private static initCameraZ: number = 25;

    private static sun: DirectionalLight;
    private static ambiantLight: HemisphericLight;
    private static sunX: number = 0;
    private static sunY: number = 500;
    private static sunZ: number = -500;

    private static currentBiome: BiomeType = BiomeType.forest;
    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: { meshes: LoadedMesh[], sprites: LoadedSprite[] } } = {};

    private static biomes: { [key in BiomeType]: Biome };

    private static renderQueue: Array<() => void> = [];


    static createWorld(scene: Scene) {
        this.initBiomes();
        this.scene = scene;
        this.camera = new UniversalCamera('camera', new Vector3(0, 0, 0), this.scene);

        this.scene.onBeforeRenderObservable.add(() => {
            for (let i = 0; i < this.itemLoadBatchSize; i++) {
                if (this.renderQueue.length === 0) {
                    break;
                }
                this.renderQueue.shift()!();
            }

            const time = performance.now() * 0.002; // Temps simulé (ralenti)
            const waveSpeed = 0.5; // Vitesse de propagation de l'onde
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

    static createLightning() {
        this.ambiantLight = new HemisphericLight('ambiantLight', new Vector3(0, 10, 0), this.scene);
        this.ambiantLight.intensity = 0.8;

        this.sun = new DirectionalLight('sun', new Vector3(0.5, -1, 0.5), this.scene);
        this.sun.position = new Vector3(this.sunX, this.sunY, this.sunZ);
        this.sun.intensity = 2;

        this.shadowGenerator = new ShadowGenerator(4096, this.sun);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurScale = 1;
    }

    static initBiomes() {
        const forestBiomes: Biome = {
            ground: 'ground',
            items: [
                {
                    asset: 'tree',
                    drawCount: 40,
                    boostDrawCount: 100,
                    boostDrawCountRate: 0.2
                },
                {
                    asset: 'rock',
                    drawCount: 8,
                },
                {
                    asset: 'grass',
                    drawCount: 80
                }
            ]
        };

        this.biomes = {
            [BiomeType.forest]: forestBiomes
        };
    }


    static drawItem(asset: GGA3DAsset, x: number, y: number, z: number, sizeRatio: number, rotate: number = 0): InstancedMesh | undefined {
        const item = asset.mesh?.createInstance(asset.name + this.cnt);

        this.cnt++;

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

        this.shadowGenerator.addShadowCaster(item);
        item.receiveShadows = true;

        this.scene.addMesh(item);
        return item;
    }

    static drawItemWithDeviation(asset: GGA3DAsset, x: number, y: number): InstancedMesh | undefined {
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

    static drawSprite(asset: GGA3DAsset, x: number, y: number, z: number, sizeRatio: number, rotate: number = 0, invert: boolean): Sprite | undefined {
        const sprite = new Sprite(asset.name + this.cnt, asset.sprite!);

        this.cnt++;

        if (!sprite) {
            return;
        }

        sprite.size = asset.height * asset.scale * sizeRatio;
        sprite.position = new Vector3(x, sprite.size / 2 + z, y);
        sprite.angle = rotate;
        sprite.invertU = invert;

        return sprite;
    }

    static drawSpriteWithDeviation(asset: GGA3DAsset, x: number, y: number): Sprite | undefined {
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

        const res = this.drawSprite(asset, x, y, deviationZ, sizeRatio, rotation, invert);

        if (!res) {
            return undefined;
        }

        return res;
    }

    static generateWorld() {
        this.setCameraPosition(0, 0);
        this.shadowGenerator.addShadowCaster(PlayerManager.playerMesh);

        this.camera.position = new Vector3(0, this.initCameraY, this.initCameraZ);

        const initRot = this.camera.rotation!.clone();

        this.camera.rotation = initRot.clone().addInPlace(new Vector3(0, Math.PI, 0));

        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

        timer(2000).subscribe(() => {
            if (PlayerManager.playerX !== 0 || PlayerManager.playerY !== 0) {
                return;
            }
            Animation.CreateAndStartAnimation('1', this.camera, 'position', 30, 120, this.camera.position!.clone(), new Vector3(this.cameraX, this.cameraY, this.cameraZ), 0, ease);
            Animation.CreateAndStartAnimation('2', this.camera, 'rotation', 30, 120, this.camera.rotation!.clone(), initRot, 0, ease);
        });
    }

    static setCameraPosition(x: number, y: number) {
        this.worldX = x;
        this.worldY = y;

        this.camera.position = new Vector3(x + this.cameraX, this.cameraY, y + this.cameraZ);
        this.camera.setTarget(new Vector3(x, 20, y));

        this.sun.position = new Vector3(x + this.sunX, this.sunY, y + this.sunZ);

        const currentChunk = this.getCurrentChunk();
        if (currentChunk !== this.currentChunk) {
            this.currentChunk = currentChunk;
            this.loadChunksArroundCurrentLocation();
        }
    }


    // CHUNCK MANAGEMENT

    private static getCurrentChunk() {
        return this.getChunk(this.worldX, this.worldY);
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

    private static loadChunksArroundCurrentLocation() {
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
        const asset = this.biomes[this.currentBiome].ground;

        const bound = this.chunckSize / 2;
        let xIndex = -bound;

        while (xIndex <= bound) {

            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex <= bound) {
                const absX = chunkX + xIndex;
                const absY = chunkY + yIndex;

                const rAsset = AssetManager.getAsset(this.currentBiome, asset, asset + absX + absY);

                yIndex += rAsset.safeZone;

                if (rAsset.safeZone > biggestAsset) {
                    biggestAsset = rAsset.safeZone;
                }

                const ground = MeshBuilder.CreateGround('ground', { width: rAsset.width, height: rAsset.height }, this.scene);

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
        this.biomes[this.currentBiome].items.forEach((item) => {
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

        const bound = this.chunckSize / 2 + 50;
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

                if (rAsset.type === 'item' && absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (WorldUtils.randBoolItem(drawRate, `${rAsset.name}draw`, absX, absY)) {
                    this.renderQueue.push(() => {
                        if (!this.loadedChuncksItems[`${chunkX}/${chunkY}`]) {
                            return;
                        }
                        if (rAsset.type === 'item') {
                            const item = this.drawItemWithDeviation(rAsset, absX, absY);
                            if (item) {
                                this.loadedChuncksItems[`${chunkX}/${chunkY}`].meshes.push({ mesh: item, asset: rAsset });
                            }
                        }
                        else if (rAsset.type === 'sprite') {
                            const item = this.drawSpriteWithDeviation(rAsset, absX, absY);
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
        const mesh = AssetManager.getFirstAsset(this.currentBiome, type);
        const maxDraw = (1000 * 1000) / (mesh.safeZone * mesh.safeZone);
        return drawCount / maxDraw;
    }

    private static deleteMeshFromScene(mesh: AbstractMesh) {
        this.scene.removeMesh(mesh);
        mesh.dispose();
        mesh = null as never;
    }

    private static deleteSpriteFromScene(sprite: Sprite) {
        sprite.dispose();
        sprite = null as never;
    }
}