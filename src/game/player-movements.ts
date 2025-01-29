import { Params } from '../core/params.js';
import { PlayerDirection, PlayerManager } from '../world/player.js';
import { WorldManager } from '../world/world.js';
import { PlayerInputs } from './player-inputs.js';

export class PlayerMovements {

    private readonly diagonalRatio: number = Math.sqrt(2);
    private readonly moveSpeed: number = Params.playerMoveSpeed;

    private totalDistance: number = 0;

    private readonly worldManager = WorldManager.getInstance();
    private readonly playerManager = PlayerManager.getInstance();

    private static instance: PlayerMovements;
    static getInstance(): PlayerMovements {
        if (!this.instance) {
            this.instance = new PlayerMovements();
        }
        return this.instance;
    }

    private constructor() {

    }

    updatePlayerPosition(time: number) {
        if (!PlayerInputs.upArrowPressed && !PlayerInputs.downArrowPressed && !PlayerInputs.leftArrowPressed && !PlayerInputs.rightArrowPressed) {
            this.playerManager.setPlayerAnimation('Idle');
            return;
        }

        if (PlayerInputs.upArrowPressed && PlayerInputs.downArrowPressed && !PlayerInputs.leftArrowPressed && !PlayerInputs.rightArrowPressed) {
            this.playerManager.setPlayerAnimation('Idle');
            return;
        }

        if (!PlayerInputs.upArrowPressed && !PlayerInputs.downArrowPressed && PlayerInputs.leftArrowPressed && PlayerInputs.rightArrowPressed) {
            this.playerManager.setPlayerAnimation('Idle');
            return;
        }

        this.playerManager.setPlayerAnimation('Running');

        const distance = this.moveSpeed * (time / 1000);

        const currentX = this.playerManager.playerX;
        const currentY = this.playerManager.playerY;

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
        this.playerManager.movePlayer(newX - currentX, newY - currentY, direction);
        this.worldManager.setCameraPosition(this.playerManager.playerMesh.position.x, this.playerManager.playerMesh.position.z);
    }
}