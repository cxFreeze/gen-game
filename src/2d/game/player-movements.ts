import { debounceTime, Subject } from 'rxjs';
import { PlayerManager } from '../world/player.js';
import { WorldManager } from '../world/world.js';
import { PlayerInputs } from './player-inputs.js';

export abstract class PlayerMovements {

    private static diagonalRatio: number = Math.sqrt(2);
    private static moveSpeed: number = 256; // px per second

    private static totalDistance: number = 0;

    private static resetPlayerAnimation$ = new Subject<void>();

    static init() {
        this.resetPlayerAnimation$.pipe(debounceTime(100)).subscribe(() => {
            this.totalDistance = 0;
            PlayerManager.resetPlayerAnimation();
        });
    }

    static updatePlayerPosition(time: number) {
        if (!PlayerInputs.upArrowPressed && !PlayerInputs.downArrowPressed && !PlayerInputs.leftArrowPressed && !PlayerInputs.rightArrowPressed) {
            return;
        }

        this.resetPlayerAnimation$.next();

        const distance = this.moveSpeed * (time / 1000);

        const currentX = PlayerManager.playerX;
        const currentY = PlayerManager.playerY;

        let newX = currentX;
        let newY = currentY;

        if (PlayerInputs.upArrowPressed) {
            newY = newY - distance;
        }

        if (PlayerInputs.downArrowPressed) {
            newY = newY + distance;
        }

        if (PlayerInputs.leftArrowPressed) {
            newX = newX - distance;
        }

        if (PlayerInputs.rightArrowPressed) {
            newX = newX + distance;
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
        if (newY > currentY) {
            direction = 'front';
        }
        else if (newY < currentY) {
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

        PlayerManager.setPlayerTexture(direction);
        PlayerManager.setPlayerAnimation(this.totalDistance);
        PlayerManager.setPlayerPosition(newX, newY);
        WorldManager.setWorldPosition(-newX, -newY, newY);
    }
}