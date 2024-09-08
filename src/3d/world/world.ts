import { AbstractMesh, Animation, CubicEase, DirectionalLight, EasingFunction, GroundMesh, HemisphericLight, InstancedMesh, Material, MeshBuilder, Scene, ShadowGenerator, UniversalCamera, Vector3 } from '@babylonjs/core';
import { timer } from 'rxjs';
import { Random } from '../../utils/random.js';
import { AssetManager, AssetType, BiomeType, GGA3DAsset } from './assets.js';
import { PlayerManager } from './player.js';


interface Biome {
    ground: AssetType;
    items: BiomeItem[];
}

interface BiomeItem { asset: AssetType, drawRate: number, boostDrawRate?: number, boostDrawRateRate?: number };

interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GGA3DAsset;
}

export abstract class WorldManager {
    static scene: Scene;
    static shadowGenerator: ShadowGenerator;

    static cnt = 0;

    private static enableDeviation = true;

    private static readonly chunckSize = 800;
    private static readonly spawnNoDrawZone = 100;

    static worldX: number = 0;
    static worldY: number = 0;

    private static camera: UniversalCamera;
    private static cameraX: number = 0;
    private static cameraY: number = 250;
    private static cameraZ: number = -220;

    private static initCameraY: number = 40;
    private static initCameraZ: number = 25;

    private static sun: DirectionalLight;
    private static ambiantLight: HemisphericLight;
    private static sunX: number = 0;
    private static sunY: number = 500;
    private static sunZ: number = -500;

    private static currentBiome: BiomeType = BiomeType.forest;
    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: LoadedMesh[] } = {};

    private static biomes: { [key in BiomeType]: Biome };

    static createWorld(scene: Scene) {
        this.initBiomes();
        this.scene = scene;
        this.camera = new UniversalCamera('camera', new Vector3(0, 0, 0), this.scene);
    }

    static createLightning() {
        this.ambiantLight = new HemisphericLight('ambiantLight', new Vector3(0, 10, 0), this.scene);
        this.ambiantLight.intensity = 0.8;
        this.sun = new DirectionalLight('sun', new Vector3(0.5, -1, 0.5), this.scene);
        this.sun.position = new Vector3(this.sunX, this.sunY, this.sunZ);
        this.sun.intensity = 4;

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
                    drawRate: 0.1,
                    boostDrawRate: 0.4,
                    boostDrawRateRate: 0.2
                },
                {
                    asset: 'rock',
                    drawRate: 0.01
                },
                {
                    asset: 'stump',
                    drawRate: 0.01
                },
                /*
                {
                    asset: 'bush',
                    drawRate: 0.01
                }
                    
                    {
                        asset: 'brush',
                        drawRate: 0.0
                    },
                    {
                        asset: 'grass',
                        drawRate: 0.07
                    }
                        */
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

        const ratio = asset.scale * sizeRatio;
        item.scaling = new Vector3(ratio, ratio, ratio);

        item.position = new Vector3(x, z, y);
        if (rotate > 0) {
            item.rotation = new Vector3(0, rotate, 0);
        }

        item.checkCollisions = !asset.ignoreCollisions;

        this.shadowGenerator.getShadowMap()?.renderList?.push(item);

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
                deviationX = 2 * asset.height * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
                deviationY = 2 * asset.height * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = 2 * asset.sizeRatio * (this.randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 100;

                if (sizeRatio < 0) {
                    sizeRatio = 1 / (1 - sizeRatio);
                }
                else {
                    sizeRatio = 1 + sizeRatio;
                }

                if (this.randNumberItem(`${asset.name}huge`, x, y) < 1) {
                    sizeRatio = sizeRatio * 3;
                }
            }

            if (asset.maxVerticalDisplacement && asset.maxVerticalDisplacement > 0) {
                deviationZ = itemHeight * sizeRatio * asset.maxVerticalDisplacement * (this.randNumberItem(`${asset.name}deviationZ`, x, y)) / 100;
            }


            rotation = this.randNumberItem(`${asset.name}rotate`, x, y) / 100 * Math.PI * 2;
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
            res.dispose();
            res.isVisible = false;
            return undefined;
        }

        return res;
    }

    static generateWorld() {
        this.setCameraPosition(0, 0);
        this.shadowGenerator.getShadowMap()?.renderList?.push(PlayerManager.playerMesh);

        this.camera.position = new Vector3(0, this.initCameraY, this.initCameraZ);
        //this.camera.setTarget(new Vector3(0, 30, 0));

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
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                chucks.push(`${currentChuckX + i * this.chunckSize}/${currentChuckY + j * this.chunckSize}`);
            }
        }
        return chucks;
    }

    private static loadChunksArroundCurrentLocation() {
        const chucks = this.getChunksToLoad();
        //unload 
        Object.keys(this.loadedChuncksItems).forEach((chunk) => {
            if (!chucks.includes(chunk)) {
                this.loadedChuncksItems[chunk].forEach((item) => {
                    item.mesh.dispose();
                });
                delete this.loadedChuncksItems[chunk];
            }
        });
        //load
        chucks.forEach((chunk) => {
            this.loadChunk(chunk);
        });
    }

    private static loadChunk(chunk: string) {
        if (this.loadedChuncksItems[chunk]) {
            return;
        };
        this.loadedChuncksItems[chunk] = [];
        const [x, y] = chunk.split('/').map((val) => parseInt(val));

        this.loadGround(x, y);
        this.loadItems(x, y);
    }

    private static loadGround(chunkX: number, chunkY: number): void {
        const asset = this.biomes[this.currentBiome].ground;

        const bound = this.chunckSize / 2;
        let xIndex = -bound;

        while (xIndex < bound) {

            let biggestAsset = 0;
            let yIndex = -bound;

            while (yIndex < bound) {
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
                //ground.checkCollisions = true;
                ground.receiveShadows = true;

                this.loadedChuncksItems[`${chunkX}/${chunkY}`].push({ mesh: ground, asset: rAsset });
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

        let drawRate = item.drawRate;

        if (item.boostDrawRate && item.boostDrawRateRate) {
            if (this.randBoolItem(item.boostDrawRateRate, item.asset, chunkX, chunkY)) {
                drawRate = item.boostDrawRateRate;
            }
        }

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

                if (absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (this.randBoolItem(drawRate, `${rAsset.name}draw`, absX, absY)) {
                    const item = this.drawItemWithDeviation(rAsset, absX, absY);

                    if (!item) {
                        continue;
                    }

                    this.loadedChuncksItems[`${chunkX}/${chunkY}`].push({ mesh: item, asset: rAsset });
                }
            }
            xIndex += biggestAsset;
        }
    }

    private static isSpaceAvailable(mesh: AbstractMesh, asset: GGA3DAsset, x: number, y: number): boolean {
        let res = true;
        const chunk = this.getChunk(x, y);
        const items = this.loadedChuncksItems[chunk];

        if (!items) {
            return true;
        }

        items.some((item) => {
            if (item.asset.type === 'ground' || item.asset.name === asset.name) {
                return false;
            }
            if (mesh.intersectsMesh(item.mesh, true)) {
                res = false;
                return true;
            }
        });

        return res;
    }


    // RAND FUNCTIONS
    private static randBoolItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }
}