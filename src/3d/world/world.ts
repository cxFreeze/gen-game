import { Random } from "../../utils/random.js";
import { AssetManager, BiomeType, GGA3DAsset } from "./assets.js";
import { GroundMesh, InstancedMesh, Material, Mesh, MeshBuilder, Scene, UniversalCamera, Vector3 } from "babylonjs";


interface Biome {
    ground: string;
    items: { asset: string, drawRate: number }[];
}

interface LoadedMesh {
    mesh: InstancedMesh | GroundMesh;
    asset: GGA3DAsset;
}

export abstract class WorldManager {
    static scene: Scene;

    static cnt = 0;

    private static enableDeviation = true;

    private static readonly chunckSize = 800;
    private static readonly spawnNoDrawZone = 20;

    static worldX: number = 0;
    static worldY: number = 0;

    private static camera: UniversalCamera;
    private static cameraX: number = 0;
    private static cameraY: number = 150;
    private static cameraZ: number = -200;

    private static currentBiome: BiomeType = BiomeType.forest;
    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: LoadedMesh[] } = {};

    private static biomes: { [key in BiomeType]: Biome };

    static createWorld(scene: Scene) {
        this.initBiomes();
        this.scene = scene;
        this.camera = new UniversalCamera('camera', new Vector3(this.cameraX, this.cameraY, this.cameraZ), this.scene);
        this.camera.setTarget(new Vector3(20, 0, 0));
    }

    static initBiomes() {
        const forestBiomes = {
            ground: 'ground',
            items: [

                {
                    asset: 'tree',
                    drawRate: 0.2
                },
                {
                    asset: 'rock',
                    drawRate: 0.02
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
        }

        this.biomes = {
            [BiomeType.forest]: forestBiomes
        }
    }


    static drawItem(asset: GGA3DAsset, x: number, y: number, sizeRatio: number, rotate: number = 0): InstancedMesh | undefined {
        const item = asset.mesh?.createInstance(asset.name + this.cnt);

        this.cnt++;

        if (!item) {
            return;
        }

        item.checkCollisions = true;

        //item.showBoundingBox = true;

        const ratio = asset.scale * sizeRatio;

        item.scaling = new Vector3(ratio, ratio, ratio);

        const itemHeight = item.getBoundingInfo().boundingBox.maximumWorld.y * ratio;

        item.position = new Vector3(x, itemHeight - 5, y);
        if (rotate > 0) {
            item.rotation = new Vector3(0, rotate, 0);
        }

        item.checkCollisions = true;

        this.scene.addMesh(item);
        return item;
    }

    static drawItemWithDeviation(asset: GGA3DAsset, x: number, y: number): InstancedMesh | undefined {
        let deviationX = 0
        let deviationY = 0

        let sizeRatio = 1;
        let rotation = 0;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationX', x, y) - 50) / 100 * asset.displacementRatio;
                deviationY = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationY', x, y) - 50) / 100 * asset.displacementRatio;
            }

            if (asset.sizeRatio > 0) {
                sizeRatio = 2 * asset.sizeRatio * (this.randNumberItem(asset.name + 'sizeRatio', x, y) - 50) / 100;

                if (sizeRatio < 0) {
                    sizeRatio = 1 / (1 - sizeRatio);
                }
                else {
                    sizeRatio = 1 + sizeRatio;
                }
            }

            rotation = this.randNumberItem(asset.name + 'rotate', x, y) / 100 * Math.PI * 2;
        }

        x = x + deviationX;
        y = y + deviationY;

        /*
        if (!this.isSpaceAvailable(x, y, asset, height)) {
            return;
        }
        */

        return this.drawItem(asset, x, y, sizeRatio, rotation);
    }

    static generateWorld() {
        this.setCameraPosition(0, 0);
    }

    static setCameraPosition(x: number, y: number) {
        this.worldX = x;
        this.worldY = y;

        this.camera.position = new Vector3(x + this.cameraX, this.cameraY, y + this.cameraZ);
        this.camera.setTarget(new Vector3(x, 0, y));

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
        if (this.loadedChuncksItems[chunk]) { return };
        this.loadedChuncksItems[chunk] = [];
        const [x, y] = chunk.split('/').map((val) => parseInt(val));

        this.loadGroundTexture(x, y);
        this.loadItems(x, y);
    }

    private static loadGroundTexture(chunkX: number, chunkY: number): void {
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

                const ground = MeshBuilder.CreateGround("ground", { width: rAsset.width, height: rAsset.height }, this.scene);
                ground.material = rAsset.material as Material
                ground.position = new Vector3(absX, 0, absY);

                this.loadedChuncksItems[chunkX + '/' + chunkY].push({ mesh: ground, asset: rAsset });
            }
            xIndex += biggestAsset;
        }
    }

    // ITEMS MANAGEMENT

    private static loadItems(chunkX: number, chunkY: number) {
        this.biomes[this.currentBiome].items.forEach((item) => {
            this.loadItemType(item.asset, chunkX, chunkY, item.drawRate);
        });
    }

    private static loadItemType(asset: string, chunkX: number, chunkY: number, probability: number) {
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

                if (absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (this.randBoolItem(probability, rAsset.name + 'draw', absX, absY)) {
                    const item = this.drawItemWithDeviation(rAsset, absX, absY);

                    if (!item) {
                        continue;
                    }

                    this.loadedChuncksItems[chunkX + '/' + chunkY].push({ mesh: item, asset: rAsset });
                }
            }
            xIndex += biggestAsset;
        }
    }



    static isSpaceAvailableForPlayer(playerMesh: Mesh): boolean {
        let res = true;
        this.loadedChuncksItems[this.currentChunk].some((item) => {
            if (playerMesh.intersectsMesh(item.mesh, true)) {
                res = false
                return true;
            }
            return false;
        });
        return res;
    }

    /*

    static isSpaceAvailableForPlayer(x: number, y: number) {
        let res = true;

        const asset = AssetManager.knight;

        const playerSafeZone = asset.collisionZone as number / 2;
        const playerX = x;
        const playerY = y;

        this.loadedChuncksItems[this.currentChunk].some((item) => {
            if (item.asset.level === AssetLevel.groundTexture || item.asset.level === AssetLevel.sky) {
                return false;
            }

            if (item.asset.collisionZone === 0) {
                return false;
            }

            const objScale = item.sprite.height / item.asset.height;

            const objX = item.sprite.x;
            const objY = item.sprite.y;

            const safeZoneValue = item.asset.collisionZone ?? item.asset.groundSafeZone ?? item.asset.safeZone;

            const objSafeZoneX = (safeZoneValue / 2) * objScale;
            const objSafeZoneY = ((item.asset.collisionZoneY ?? safeZoneValue) / 2) * objScale;

            const A = playerX - playerSafeZone;
            const B = playerX + playerSafeZone;
            const C = objX - objSafeZoneX;
            const D = objX + objSafeZoneX;

            if (B <= C || D <= A) {
                return false;
            }

            const E = playerY - 2 * playerSafeZone;
            const F = playerY;
            const G = objY - 2 * objSafeZoneY;
            const H = objY;

            if (F <= G || H <= E) {
                return false;
            }

            res = false;
            return true;
        });

        return res;
    }

    private static isOutOfChunck(x: number, y: number, height: number, width: number, chuckX: number, chuckY: number) {
        const bound = this.chunckSize / 2;

        if (x + width / 2 > chuckX + bound || x - width / 2 < chuckX - bound) {
            return true;
        }

        if (y - height / 2 > chuckY + bound || y - height < chuckY - bound) {
            return true;
        }

        return false;
    }
        */


    // RAND FUNCTIONS
    private static randBoolItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }
}