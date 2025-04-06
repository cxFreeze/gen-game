import { Params } from '../core/params.js';
import { WorldManager } from '../world/world.js';
import { CharDirection } from './character.js';
import { PlayerInputs } from './player-inputs.js';
import { Player } from './player.js';

export class PlayerMovements {

    private readonly diagonalRatio: number = Math.sqrt(2);
    private readonly moveSpeed: number = Params.playerMoveSpeed;

    private totalDistance: number = 0;

    private readonly worldManager = WorldManager.getInstance();
    private readonly player = Player.getInstance();

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
        if ((!PlayerInputs.forwardPressed && !PlayerInputs.backwardsPressed && !PlayerInputs.leftPressed && !PlayerInputs.rightPressed)
            || (PlayerInputs.forwardPressed && PlayerInputs.backwardsPressed && !PlayerInputs.leftPressed && !PlayerInputs.rightPressed)
            || (!PlayerInputs.forwardPressed && !PlayerInputs.backwardsPressed && PlayerInputs.leftPressed && PlayerInputs.rightPressed)
        ) {
            this.player.setPlayerAnimation('Idle');
            return;
        }

        this.player.setPlayerAnimation('Running');

        const distance = this.moveSpeed * (time / 1000);

        const currentX = this.player.position.x;
        const currentY = this.player.position.z;

        let newX = currentX;
        let newY = currentY;

        if (PlayerInputs.forwardPressed) {
            newY = newY + distance;
        }

        if (PlayerInputs.backwardsPressed) {
            newY = newY - distance;
        }

        if (PlayerInputs.leftPressed) {
            newX = newX + distance;
        }

        if (PlayerInputs.rightPressed) {
            newX = newX - distance;
        }


        if (newX !== currentX && newY !== currentY) {
            newX = currentX - (currentX - newX) / this.diagonalRatio;
            newY = currentY - (currentY - newY) / this.diagonalRatio;
        }

        let direction: CharDirection;

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
        this.player.move(newX - currentX, newY - currentY, direction);
        this.worldManager.setCameraPosition(this.player.position.x, this.player.position.z);
    }
}