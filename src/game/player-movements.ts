import { PlayerManager } from "../world/player.js";
import { WorldManager } from "../world/world.js";
import { PlayerInputs } from "./player-inputs.js";

export abstract class PlayerMovements {

    private static diagonalRatio: number = Math.sqrt(2);
    private static moveSpeed: number = 512; // px per second

    static updatePlayerPosition(time: number) {
        if (!PlayerInputs.upArrowPressed && !PlayerInputs.downArrowPressed && !PlayerInputs.leftArrowPressed && !PlayerInputs.rightArrowPressed) {
            return;
        }

        const distance = this.moveSpeed * (time / 1000);

        const currentX = PlayerManager.playerX;
        const currentY = PlayerManager.playerY;

        let newX = currentX;
        let newY = currentY;

        if (PlayerInputs.upArrowPressed) {
            newY = newY - distance;
        }

        if (PlayerInputs.downArrowPressed) {
            newY = newY + distance
        }

        if (PlayerInputs.leftArrowPressed) {
            newX = newX - distance
        }

        if (PlayerInputs.rightArrowPressed) {
            newX = newX + distance
        }

        if (newX !== currentX && newY !== currentY) {
            newX = currentX - (currentX - newX) / this.diagonalRatio;
            newY = currentY - (currentY - newY) / this.diagonalRatio;
        }

        PlayerManager.setPlayerPosition(newX, newY);
        WorldManager.setWorldPosition(-newX, -newY, newY);
    }
}