import { PlayerManager } from "../world/player.js";
import { WorldManager } from "../world/world.js";
import { PlayerInputs } from "./player-inputs.js";

export abstract class PlayerMovements {

    private static diagonalRatio: number = Math.sqrt(2);
    private static moveSpeed: number = 256; // px per second

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

        if (!WorldManager.isSpaceAvailableForPlayer(newX, newY)) {
            if (WorldManager.isSpaceAvailableForPlayer(newX, currentY)) {
                newY = currentY;
            }
            else if (WorldManager.isSpaceAvailableForPlayer(currentX, newY)) {
                newX = currentX;
            }
            else {
                return;
            }
        }

        if (newX !== currentX && newY !== currentY) {
            newX = currentX - (currentX - newX) / this.diagonalRatio;
            newY = currentY - (currentY - newY) / this.diagonalRatio;
        }

        let direction: 'front' | 'back' | 'left' | 'right';
        if (newX > currentX) {
            direction = 'left';
        }
        else if (newX < currentX) {
            direction = 'right';
        }
        else if (newY > currentY) {
            direction = 'front';
        }
        else if (newY < currentY) {
            direction = 'back';
        }
        else {
            return;
        }

        PlayerManager.setPlayerTexture(direction);
        PlayerManager.setPlayerPosition(newX, newY);
        WorldManager.setWorldPosition(-newX, -newY, newY);
    }
}