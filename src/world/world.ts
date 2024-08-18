import { Application, Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import { Random } from "../utils/random.js";
import { AssetLevel, AssetManager, AssetZIndex, GGAsset } from "./assets.js";

enum BiomeType { forest = 1 };

interface Biome {
    ground: GGAsset;
    items: { asset: GGAsset, drawRate: number }[];
}

interface LoadedSprite {
    sprite: Sprite;
    asset: GGAsset;
}

export abstract class WorldManager {

    static worldContainer: Container;

    private static debugContainer: Container;
    private static debugInfos: Text;
    private static debugTime: number = 0;

    private static enableDeviation = true;

    //private static readonly worldUnit = 10;
    private static readonly chunckSize = 2000;
    private static readonly spawnNoDrawZone = 200;

    private static absDefaultWorldX: number;
    private static absDefaultWorldY: number;

    static worldX: number = 0;
    static worldY: number = 0;

    private static currentBiome: BiomeType = BiomeType.forest;
    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: LoadedSprite[] } = {};

    private static biomes: { [key in BiomeType]: Biome };

    static createWorld(app: Application) {
        this.initBiomes();
        this.worldContainer = new Container();
        this.absDefaultWorldX = app.screen.width / 2;
        this.absDefaultWorldY = app.screen.height / 2;
        this.worldContainer.x = this.absDefaultWorldX;
        this.worldContainer.y = this.absDefaultWorldY;
        this.worldContainer.height = app.screen.height;
        this.worldContainer.width = app.screen.width;
        app.stage.addChild(this.worldContainer);
        this.initDebugInfos(app);
    }

    static initBiomes() {
        const forestBiomes = {
            ground: AssetManager.forestGround,
            items: [{
                asset: AssetManager.tree,
                drawRate: 0.2
            }, {
                asset: AssetManager.rock,
                drawRate: 0.05
            },
                /*
                {
                    asset: AssetManager.grass,
                    drawRate: 0.07
                }
                 */
            ]
        }

        this.biomes = {
            [BiomeType.forest]: forestBiomes
        }
    }


    static drawItem(asset: GGAsset, x: number, y: number, height: number, width: number): Sprite | undefined {
        const item = new Sprite(asset.texture);
        item.width = height;
        item.height = width;
        item.x = x - item.width / 2;
        item.y = y - item.height;
        item.zIndex = y;

        return this.worldContainer.addChild(item);
    }

    static drawItemWithDeviation(asset: GGAsset, x: number, y: number): Sprite | undefined {
        let deviationX = 0
        let deviationY = 0

        let height = asset.height;
        let width = asset.width;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationX', x, y) - 50) / 100 * asset.displacementRatio;
                deviationY = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationY', x, y) - 50) / 100 * asset.displacementRatio;
            }



            if (asset.sizeRatio > 0) {
                let sizeRatio = 2 * asset.sizeRatio * (this.randNumberItem(asset.name + 'sizeRatio', x, y) - 50) / 100;
                if (sizeRatio < 0) {
                    sizeRatio = 1 - (1 / (1 - sizeRatio));
                }
                height = asset.height * (1 + sizeRatio);
                width = asset.width * (1 + sizeRatio);
            }
        }



        x = x + deviationX;
        y = y + deviationY;

        if (!this.isSpaceAvailable(x, y, asset, height)) {
            return;
        }

        return this.drawItem(asset, x, y, height, width);
    }


    static generateWorld() {
        this.setWorldPosition(0, 0, 0);
    }

    static setWorldPosition(x: number, y: number, playerY: number) {
        this.worldX = -x;
        this.worldY = -y;
        this.worldContainer.x = this.absDefaultWorldX + x;
        this.worldContainer.y = this.absDefaultWorldY + y;

        const currentChunk = this.getCurrentChunk();
        if (currentChunk !== this.currentChunk) {
            this.currentChunk = currentChunk;
            this.loadChunksArroundCurrentLocation();

        }
        this.updateWorldItemsZindex(playerY);
    }

    private static updateWorldItemsZindex(playerY: number) {
        this.worldContainer.children.forEach((child) => {
            if (child instanceof Sprite && child.zIndex < AssetZIndex.sky && child.zIndex > AssetZIndex.ground) {
                child.zIndex = (child.y + child.height) - playerY;
            }
        });
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
                    item.sprite.destroy();
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
        this.loadItemType(this.biomes[this.currentBiome].ground, chunkX, chunkY, 1);
    }


    // ITEMS MANAGEMENT

    private static loadItems(chunkX: number, chunkY: number) {
        this.biomes[this.currentBiome].items.forEach((item) => {
            this.loadItemType(item.asset, chunkX, chunkY, item.drawRate);
        });

    }

    private static loadItemType(asset: GGAsset, chunkX: number, chunkY: number, probability: number) {
        let bound = this.chunckSize / 2;
        if (asset.level !== AssetLevel.groundTexture) {
            bound -= asset.safeZone / 2 - 1;
        }
        for (let i = -bound; i < bound; i += asset.safeZone) {
            for (let j = -bound; j < bound; j += asset.safeZone) {
                const absX = chunkX + i;
                const absY = chunkY + j;

                if (asset.level >= AssetLevel.ground && absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (this.randLoadItem(probability, asset.name, absX, absY)) {
                    const item = this.drawItemWithDeviation(asset, absX, absY);
                    if (!item) {
                        continue;
                    }
                    if (asset.level === AssetLevel.groundTexture) {
                        item.zIndex = AssetZIndex.groundTexture;
                    }
                    if (asset.level === AssetLevel.ground) {
                        item.zIndex = AssetZIndex.ground;
                    }
                    else if (asset.level === AssetLevel.sky) {
                        item.zIndex = AssetZIndex.sky;
                    }
                    this.loadedChuncksItems[chunkX + '/' + chunkY].push({ sprite: item, asset });
                }
            }
        }
    }

    private static isSpaceAvailable(x: number, y: number, asset: GGAsset, height: number) {
        if (asset.level === AssetLevel.groundTexture || asset.level === AssetLevel.sky) {
            return true;
        }

        const safeZoneProp: 'safeZone' | 'groundSafeZone' = asset.level === AssetLevel.ground ? 'groundSafeZone' : 'safeZone';

        let res = true;

        const chunk = this.getChunk(x, y);

        const obj1SafeZone = asset[safeZoneProp] / 2;
        const obj1X = x;
        let obj1Y = y;

        //center
        if (safeZoneProp === 'safeZone') {
            obj1Y = y - height / 2;
        }

        if (!this.loadedChuncksItems[chunk]) {
            return true;
        }

        this.loadedChuncksItems[chunk].forEach((item) => {
            if (!res) {
                return;
            }

            if (item.asset.level === AssetLevel.groundTexture || item.asset.level === AssetLevel.sky) {
                return;
            }

            const obj2X = item.sprite.x + item.sprite.width / 2;
            let obj2Y = item.sprite.y + item.sprite.height;

            if (safeZoneProp === 'safeZone') {
                obj2Y = item.sprite.y + item.sprite.height / 2;
            }

            const obj2SafeZone = item.asset[safeZoneProp] / 2;
            const A = obj1X - obj1SafeZone;
            const B = obj1X + obj1SafeZone;
            const C = obj2X - obj2SafeZone;
            const D = obj2X + obj2SafeZone;

            if (B <= C || D <= A) {
                return;
            }

            const E = obj1Y - obj1SafeZone;
            const F = obj1Y + obj1SafeZone;
            const G = obj2Y - obj2SafeZone;
            const H = obj2Y + obj2SafeZone;

            if (F <= G || H <= E) {
                return;
            }

            res = false;
        });

        return res;
    }



    // WORLD INFO DEBUG

    private static initDebugInfos(app: Application) {
        const width = 300;
        const height = 40;

        this.debugContainer = new Container();
        this.debugContainer.x = 0;
        this.debugContainer.y = 0;
        this.debugContainer.zIndex = 1000;
        this.debugContainer.width = width;
        this.debugContainer.height = height;
        const debugBg = new Graphics().rect(0, 0, width, height).fill('fff').stroke('000');
        this.debugContainer.addChild(debugBg);

        this.debugInfos = new Text({ text: '', style: { fill: 'black', fontSize: 16 } });
        this.debugInfos.x = 10;
        this.debugInfos.y = 10;
        this.debugContainer.addChild(this.debugInfos);

        app.stage.addChild(this.debugContainer);
    }

    static updateDebugInfos(ticker: Ticker) {
        this.debugTime += ticker.elapsedMS;

        if (this.debugTime > 500) {
            this.debugTime = 0;
            this.debugInfos.text = `x: ${Math.floor(this.worldX)}   y: ${Math.floor(this.worldY)}   icnt: ${this.worldContainer.children.length}  fps: ${Math.floor(ticker.FPS)}`;
        }
    }


    // RAND FUNCTIONS

    private static randLoadItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }

}