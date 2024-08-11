import { Application, Container, Graphics, Sprite, Text, Ticker } from "pixi.js";
import { AssetManager, GGAsset } from "./assets.js";

export abstract class WorldManager {

    static worldContainer: Container;

    private static debugContainer: Container;
    private static debugInfos: Text;
    private static debugTime: number = 0;

    private static readonly chunckSize = 2000;
    private static readonly worldReachUnit = 200;

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
        const item = new Sprite(asset.asset);
        item.width = asset.width;
        item.height = asset.height;
        item.x = x - item.width / 2;
        item.y = y - item.height;
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
            if (child instanceof Sprite) {
                child.zIndex = (child.y + child.height) - playerY;
            }
        });
    }


    // CHUNCK MANAGEMENT

    private static getCurrentChunk() {
        const currentChuckX = Math.trunc(this.worldX / this.chunckSize) * this.chunckSize;
        const currentChuckY = Math.trunc(this.worldY / this.chunckSize) * this.chunckSize;
        return `${currentChuckX}/${currentChuckY}`;
    }

    private static getChunksToLoad() {
        const [currentChuckX, currentChuckY] = this.currentChunk.split('/').map((val) => parseInt(val));
        const chucks = [];
        console.log(currentChuckX, currentChuckY, this.chunckSize, this.currentChunk);
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                chucks.push(`${currentChuckX + i * this.chunckSize}/${currentChuckY + j * this.chunckSize}`);
            }
        }
        return chucks;
    }

    private static loadChunksArroundCurrentLocation() {
        const chucks = this.getChunksToLoad();
        console.log(chucks);
        chucks.forEach((chunk) => {
            this.loadChunk(chunk);
        });
    }

    private static loadChunk(chunk: string) {
        if (this.loadedChuncksItems[chunk]) { return };
        const halfChuck = this.chunckSize / 2;
        this.loadedChuncksItems[chunk] = [];
        const [x, y] = chunk.split('/').map((val) => parseInt(val));
        for (let i = -halfChuck; i < halfChuck; i += this.worldReachUnit) {
            for (let j = -halfChuck; j < halfChuck; j += this.worldReachUnit) {
                if (Math.random() > 0.7) {
                    const deviation = Math.random() * 30;
                    var item = this.drawItem(AssetManager.tree, x + i + deviation, y + j + deviation);
                    console.log(item, "tree created at ", item.x, item.y, " in chunk ", chunk);
                    this.loadedChuncksItems[chunk].push(item);
                }
            }
        }
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
}