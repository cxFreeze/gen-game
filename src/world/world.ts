import { Application, Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import { Random } from "../utils/random.js";
import { AssetLevel, AssetManager, AssetZIndex, GGAsset } from "./assets.js";


export abstract class WorldManager {

    static worldContainer: Container;

    private static debugContainer: Container;
    private static debugInfos: Text;
    private static debugTime: number = 0;

    //private static readonly worldUnit = 10;
    private static readonly chunckSize = 2000;
    private static readonly spawnNoDrawZone = 200;

    private static absDefaultWorldX: number;
    private static absDefaultWorldY: number;

    static worldX: number = 0;
    static worldY: number = 0;

    private static currentChunk: string;
    private static loadedChuncksItems: { [key: string]: Sprite[] } = {};

    static createWorld(app: Application) {
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

    static drawItem(asset: GGAsset, x: number, y: number): Sprite {
        let deviationX = 0
        let deviationY = 0

        if (asset.displacementRatio > 0) {
            deviationX = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationX', x, y) - 50) / 100 * asset.displacementRatio;
            deviationY = 2 * asset.height * (this.randNumberItem(asset.name + 'deviationY', x, y) - 50) / 100 * asset.displacementRatio;
        }

        let height = asset.height;
        let width = asset.width;

        if (asset.sizeRatio > 0) {
            let sizeRatio = 2 * asset.sizeRatio * (this.randNumberItem(asset.name + 'sizeRatio', x, y) - 50) / 100;
            if (sizeRatio < 0) {
                console.log(sizeRatio, - (1 / (1 - sizeRatio)))
                sizeRatio = 1 - (1 / (1 - sizeRatio));
            }
            height = asset.height * (1 + sizeRatio);
            width = asset.width * (1 + sizeRatio);
        }

        const item = new Sprite(asset.asset);
        item.width = height;
        item.height = width;
        item.x = x - item.width / 2 + deviationX;
        item.y = y - item.height + deviationY;
        item.zIndex = y;
        return this.worldContainer.addChild(item);
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
        const currentChuckX = Math.round(this.worldX / this.chunckSize) * this.chunckSize;
        const currentChuckY = Math.round(this.worldY / this.chunckSize) * this.chunckSize;
        return `${currentChuckX}/${currentChuckY}`;
    }

    private static getChunksToLoad() {
        console.log(this.currentChunk);
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
                    item.destroy();
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
        this.loadItemType(AssetManager.ground, chunkX, chunkY, 1);
    }

    private static loadItems(chunkX: number, chunkY: number) {
        this.loadItemType(AssetManager.tree, chunkX, chunkY, 0.2);
        this.loadItemType(AssetManager.rock, chunkX, chunkY, 0.04);
        this.loadItemType(AssetManager.grass, chunkX, chunkY, 0.07);
    }

    private static loadItemType(asset: GGAsset, chunkX: number, chunkY: number, probability: number) {
        for (let i = -this.chunckSize / 2; i < this.chunckSize / 2; i += asset.safeZone) {
            for (let j = -this.chunckSize / 2; j < this.chunckSize / 2; j += asset.safeZone) {
                const absX = chunkX + i;
                const absY = chunkY + j;
                if (asset.level >= AssetLevel.ground && absX < this.spawnNoDrawZone && absY < this.spawnNoDrawZone && absX > -this.spawnNoDrawZone && absY > -this.spawnNoDrawZone) {
                    continue;
                }


                if (this.randLoadItem(probability, asset.name, absX, absY)) {
                    var item = this.drawItem(asset, absX, absY);
                    if (asset.level === AssetLevel.groundTexture) {
                        item.zIndex = AssetZIndex.groundTexture;
                    }
                    if (asset.level === AssetLevel.ground) {
                        item.zIndex = AssetZIndex.ground;
                    }
                    else if (asset.level === AssetLevel.sky) {
                        item.zIndex = AssetZIndex.sky;
                    }
                    this.loadedChuncksItems[chunkX + '/' + chunkY].push(item);
                }
            }
        }
    }

    private static randLoadItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    private static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
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

    static
        updateDebugInfos(ticker: Ticker) {
        this.debugTime += ticker.elapsedMS;

        if (this.debugTime > 500) {
            this.debugTime = 0;
            this.debugInfos.text = `x: ${Math.floor(this.worldX)}   y: ${Math.floor(this.worldY)}   icnt: ${this.worldContainer.children.length}  fps: ${Math.floor(ticker.FPS)}`;
        }
    }
}