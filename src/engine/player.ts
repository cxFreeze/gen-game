import { Application, Container, Graphics } from "pixi.js";
import { AssetManager } from "./assets.js";

export abstract class PlayerManager {

    static playerContainer: Container;

    static async createPlayer(app: Application) {
        this.playerContainer = new Container();
        this.playerContainer.x = app.screen.width / 2;
        this.playerContainer.y = app.screen.height / 2;
        this.playerContainer.height = app.screen.height;
        this.playerContainer.width = app.screen.width;
        app.stage.addChild(this.playerContainer);

        this.drawPlayer();
    }

    private static async drawPlayer() {
        const graphics = new Graphics(AssetManager.knight.asset);
        graphics.width = AssetManager.knight.width;
        graphics.height = AssetManager.knight.height;
        graphics.x = 0;
        graphics.y = 0;
        this.playerContainer.addChild(graphics);
    }

}