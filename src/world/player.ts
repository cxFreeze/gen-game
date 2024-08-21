import { Container, Sprite } from "pixi.js";
import { AssetManager } from "./assets.js";
import { WorldManager } from "./world.js";
import { Anim } from "../utils/anim.js";

export abstract class PlayerManager {
    static playerContainer: Container;
    static playerSprite: Sprite;
    static currentPlayerDirection: 'front' | 'back' | 'left' | 'right' = 'front';

    private static absDefaultPlayerX: number;
    private static absDefaultPlayerY: number;

    static playerX: number = 0;
    static playerY: number = 0;

    private static basePlayerScale = 1;

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
        const playerSprite = new Sprite({ texture: AssetManager.knight.texture, anchor: { x: 0.5, y: 1 } });
        playerSprite.width = AssetManager.knight.width as number;
        playerSprite.height = AssetManager.knight.height as number;
        playerSprite.x = 0;
        playerSprite.y = 0;
        this.playerSprite = this.playerContainer.addChild(playerSprite);
        this.basePlayerScale = this.playerSprite.scale.y;
    }

    static setPlayerPosition(x: number, y: number) {
        this.playerX = x;
        this.playerY = y;
        this.playerContainer.x = this.absDefaultPlayerX + x;
        this.playerContainer.y = this.absDefaultPlayerY + y;
    }

    static setPlayerTexture(direction: 'front' | 'back' | 'left' | 'right') {
        if (this.currentPlayerDirection === direction) {
            return;
        }
        this.currentPlayerDirection = direction;

        if (this.playerSprite.scale.x < 0) {
            this.playerSprite.scale.x *= -1;
        }

        let texture: 'front' | 'back' | 'side';
        if (direction === 'left') {
            texture = 'side';
        }
        else if (direction === 'right') {
            texture = 'side';
            this.playerSprite.scale.x *= -1;
        }
        else {
            texture = direction;
        }
        this.playerSprite.texture = AssetManager.knightTextures[texture];
    }


    static setPlayerAnimation(distance: number) {
        const factor = 1 + Math.sin(distance / 50) / 25;
        this.playerSprite.scale.y = this.basePlayerScale * factor;
    }

    static resetPlayerAnimation() {
        Anim.tween(this.playerSprite.scale.y, this.basePlayerScale, 100).subscribe(v => {
            this.playerSprite.scale.y = v;
        });
    }
}