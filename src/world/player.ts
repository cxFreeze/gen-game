import { Container, Sprite } from "pixi.js";
import { AssetManager } from "./assets.js";
import { WorldManager } from "./world.js";

export abstract class PlayerManager {
    static playerContainer: Container;

    private static absDefaultPlayerX: number;
    private static absDefaultPlayerY: number;

    static playerX: number = 0;
    static playerY: number = 0;

    static createPlayer() {
        this.playerContainer = new Container();
        const parentContainer = WorldManager.worldContainer;
        this.absDefaultPlayerX = parentContainer.width / 2;
        this.absDefaultPlayerY = parentContainer.height / 2;
        this.playerContainer.x = this.absDefaultPlayerX;
        this.playerContainer.y = this.absDefaultPlayerY;
        this.playerContainer.height = AssetManager.knight.width as number;
        this.playerContainer.width = AssetManager.knight.height as number;
        this.playerContainer.zIndex = 0;
        parentContainer.addChild(this.playerContainer);

        this.drawPlayer();
    }

    private static drawPlayer() {
        const playerSprite = new Sprite(AssetManager.knight.asset);
        playerSprite.width = AssetManager.knight.width as number;
        playerSprite.height = AssetManager.knight.height as number;
        playerSprite.x = -playerSprite.width / 2;
        playerSprite.y = -playerSprite.height;
        this.playerContainer.addChild(playerSprite);
    }

    static setPlayerPosition(x: number, y: number) {
        this.playerX = x;
        this.playerY = y;
        this.playerContainer.x = this.absDefaultPlayerX + x;
        this.playerContainer.y = this.absDefaultPlayerY + y;
    }
}