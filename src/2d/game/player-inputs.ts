export abstract class PlayerInputs {

    static upArrowPressed: boolean = false;
    static downArrowPressed: boolean = false;
    static leftArrowPressed: boolean = false;
    static rightArrowPressed: boolean = false;

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
}