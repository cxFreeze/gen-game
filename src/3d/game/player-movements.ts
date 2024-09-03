import { PlayerDirection, PlayerManager } from '../world/player.js';
import { WorldManager } from '../world/world.js';
import { PlayerInputs } from './player-inputs.js';

export abstract class PlayerMovements {

    private static diagonalRatio: number = Math.sqrt(2);
    private static moveSpeed: number = 100; // px per second

    private static totalDistance: number = 0;

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
            newY = newY + distance;
        }

        if (PlayerInputs.downArrowPressed) {
            newY = newY - distance;
        }

        if (PlayerInputs.leftArrowPressed) {
            newX = newX + distance;
        }

        if (PlayerInputs.rightArrowPressed) {
            newX = newX - distance;
        }


        if (newX !== currentX && newY !== currentY) {
            newX = currentX - (currentX - newX) / this.diagonalRatio;
            newY = currentY - (currentY - newY) / this.diagonalRatio;
        }

        let direction: PlayerDirection;

        if (newX > currentX && newY > currentY) {
            direction = 'front-left';
        }
        else if (newX < currentX && newY > currentY) {
            direction = 'front-right';
        }
        else if (newX > currentX && newY < currentY) {
            direction = 'back-left';
        }
        else if (newX < currentX && newY < currentY) {
            direction = 'back-right';
        }
        else if (newY < currentY) {
            direction = 'front';
        }
        else if (newY > currentY) {
            direction = 'back';
        }
        else if (newX > currentX) {
            direction = 'left';
        }
        else if (newX < currentX) {
            direction = 'right';
        }
        else {
            return;
        }

        this.totalDistance += distance;
        PlayerManager.movePlayer(newX - currentX, newY - currentY, direction);
        WorldManager.setCameraPosition(PlayerManager.playerMesh.position.x, PlayerManager.playerMesh.position.z);
    }
}