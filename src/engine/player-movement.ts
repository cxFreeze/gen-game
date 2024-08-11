import { PlayerManager } from "./player.js";
import { WorldManager } from "./world.js";

export abstract class PlayerMovement {

    private static upArrowPressed: boolean = false;
    private static downArrowPressed: boolean = false;
    private static leftArrowPressed: boolean = false;
    private static rightArrowPressed: boolean = false;

    private static diagonalRatio: number = Math.sqrt(2);

    private static moveSpeed: number = 512; // px per second

    static init() {
        window.addEventListener("keydown", (event) => {
            if (event.key === "ArrowUp") {
                this.upArrowPressed = true;
            }
            if (event.key === "ArrowDown") {
                this.downArrowPressed = true;
            }
            if (event.key === "ArrowLeft") {
                this.leftArrowPressed = true;
            }
            if (event.key === "ArrowRight") {
                this.rightArrowPressed = true;
            }
        });
        window.addEventListener("keyup", (event) => {
            if (event.key === "ArrowUp") {
                this.upArrowPressed = false;
            }
            if (event.key === "ArrowDown") {
                this.downArrowPressed = false;
            }
            if (event.key === "ArrowLeft") {
                this.leftArrowPressed = false;
            }
            if (event.key === "ArrowRight") {
                this.rightArrowPressed = false;
            }
        });
    }

    static updatePlayerPosition(time: number) {
        if (!this.upArrowPressed && !this.downArrowPressed && !this.leftArrowPressed && !this.rightArrowPressed) {
            return;
        }

        const distance = this.moveSpeed * (time / 1000);

        const currentX = PlayerManager.playerX;
        const currentY = PlayerManager.playerY;

        let newX = currentX;
        let newY = currentY;

        if (this.upArrowPressed) {
            newY = newY - distance;
        }

        if (this.downArrowPressed) {
            newY = newY + distance
        }

        if (this.leftArrowPressed) {
            newX = newX - distance
        }

        if (this.rightArrowPressed) {
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