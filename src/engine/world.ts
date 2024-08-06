import { Application, Container, Graphics } from "pixi.js";
import { GGAsset } from "./assets.js";

export abstract class WorldManager {

    static worldContainer: Container;

    static async createWorld(app: Application) {
        this.worldContainer = new Container();
        this.worldContainer.x = app.screen.width / 2;
        this.worldContainer.y = app.screen.height / 2;
        this.worldContainer.height = app.screen.height;
        this.worldContainer.width = app.screen.width;
        app.stage.addChild(this.worldContainer);
    }

    static async drawItem(asset: GGAsset, x: number, y: number) {
        const graphics = new Graphics(asset.asset);
        graphics.width = asset.width;
        graphics.height = asset.height;
        graphics.x = x;
        graphics.y = y;
        this.worldContainer.addChild(graphics);
    }

}