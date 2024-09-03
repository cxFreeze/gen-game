import { Application, Container, Graphics, Sprite, Text, Ticker } from 'pixi.js';
import { Random } from '../../utils/random.js';
import { AssetLevel, AssetManager, AssetZIndex, BiomeType, GGAsset } from './assets.js';


interface Biome {
    ground: string;
    items: { asset: string, drawRate: number }[];
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
            ground: 'ground',
            items: [{
                asset: 'tree',
                drawRate: 0.2
            }, {
                asset: 'rock',
                drawRate: 0.02
            },
            {
                asset: 'bush',
                drawRate: 0.01
            }
                /*
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


    static drawItem(asset: GGAsset, x: number, y: number, height: number, width: number, flip: boolean = false): Sprite | undefined {
        const item = new Sprite({ texture: asset.texture, anchor: { x: 0.5, y: 1 }, });

        item.height = height;
        item.width = width;
        item.x = x;
        item.y = y;
        item.zIndex = y - this.worldY;

        if (flip) {
            item.scale.x *= -1;
        }

        return this.worldContainer.addChild(item);
    }

    static drawItemWithDeviation(asset: GGAsset, x: number, y: number, chunckX: number, chunckY: number): Sprite | undefined {
        let deviationX = 0;
        let deviationY = 0;

        let height = asset.height;
        let width = asset.width;

        let flip = false;

        if (this.enableDeviation) {
            if (asset.displacementRatio > 0) {
                deviationX = 2 * asset.height * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
                deviationY = 2 * asset.height * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
            }

            if (asset.sizeRatio > 0) {
                let sizeRatio = 2 * asset.sizeRatio * (this.randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 100;
                if (sizeRatio < 0) {
                    sizeRatio = 1 - (1 / (1 - sizeRatio));
                }
                height = asset.height * (1 + sizeRatio);
                width = asset.width * (1 + sizeRatio);
            }

            flip = this.randBoolItem(0.4, `${asset.name}flip`, x, y);
        }

        x = x + deviationX;
        y = y + deviationY;

        if (!this.isSpaceAvailable(x, y, asset, height)) {
            return;
        }

        if (asset.level > AssetLevel.groundTexture && asset.level < AssetLevel.sky) {
            if (this.isOutOfChunck(x, y, height, width, chunckX, chunckY)) {
                return;
            }
        }

        return this.drawItem(asset, x, y, height, width, flip);
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
                child.zIndex = child.y - playerY;
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
        if (this.loadedChuncksItems[chunk]) {
            return;
        };
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

                if (rAsset.level >= AssetLevel.ground && absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }

                if (this.randBoolItem(probability, `${rAsset.name}draw`, absX, absY)) {
                    const item = this.drawItemWithDeviation(rAsset, absX, absY, chunkX, chunkY);
                    if (!item) {
                        continue;
                    }
                    if (rAsset.level === AssetLevel.groundTexture) {
                        item.zIndex = AssetZIndex.groundTexture;
                    }
                    if (rAsset.level === AssetLevel.ground) {
                        item.zIndex = AssetZIndex.ground;
                    }
                    else if (rAsset.level === AssetLevel.sky) {
                        item.zIndex = AssetZIndex.sky;
                    }
                    this.loadedChuncksItems[`${chunkX}/${chunkY}`].push({ sprite: item, asset: rAsset });
                }
            }
            xIndex += biggestAsset;
        }
    }

    private static isSpaceAvailable(x: number, y: number, asset: GGAsset, height: number) {
        if (asset.level === AssetLevel.groundTexture || asset.level === AssetLevel.sky) {
            return true;
        }


        let res = true;

        const chunk = this.getChunk(x, y);
        if (!this.loadedChuncksItems[chunk]) {
            return true;
        }

        const obj1Scale = height / asset.height;

        const obj1X = x;
        const obj1Y = y;


        this.loadedChuncksItems[chunk].some((item) => {
            if (item.asset.level === AssetLevel.groundTexture || item.asset.level === AssetLevel.sky || item.asset.name === asset.name) {
                return false;
            }

            const safeZoneProp: 'safeZone' | 'groundSafeZone' = asset.level === AssetLevel.large && item.asset.level === AssetLevel.large ? 'safeZone' : 'groundSafeZone';

            const obj1SafeZone = (asset[safeZoneProp] / 2) * obj1Scale;


            const obj2Scale = item.sprite.height / item.asset.height;

            const obj2X = item.sprite.x;
            const obj2Y = item.sprite.y;

            const obj2SafeZone = (item.asset[safeZoneProp] / 2) * obj2Scale;
            const A = obj1X - obj1SafeZone;
            const B = obj1X + obj1SafeZone;
            const C = obj2X - obj2SafeZone;
            const D = obj2X + obj2SafeZone;

            if (B <= C || D <= A) {
                return false;
            }

            const E = obj1Y - 2 * obj1SafeZone;
            const F = obj1Y;
            const G = obj2Y - 2 * obj2SafeZone;
            const H = obj2Y;

            if (F <= G || H <= E) {
                return false;
            }

            res = false;
            return true;
        });

        return res;
    }

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
            this.debugInfos.text = `x: ${Math.floor(this.worldX / 100)}   y: ${Math.floor(this.worldY / 100)}   icnt: ${this.worldContainer.children.length}  fps: ${Math.floor(ticker.FPS)}`;
        }
    }


    // RAND FUNCTIONS
    private static randBoolItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }
}