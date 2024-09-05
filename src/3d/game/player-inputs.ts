import { VirtualJoystick } from '@babylonjs/core';

export abstract class PlayerInputs {

    static upArrowPressed: boolean = false;
    static downArrowPressed: boolean = false;
    static leftArrowPressed: boolean = false;
    static rightArrowPressed: boolean = false;

    static joystick: VirtualJoystick;

    static init() {
        this.joystick = new VirtualJoystick(true);
        this.joystick.setJoystickSensibility(10);

        window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                this.upArrowPressed = true;
            }
            if (event.key === 'ArrowDown') {
                this.downArrowPressed = true;
            }
            if (event.key === 'ArrowLeft') {
                this.leftArrowPressed = true;
            }
            if (event.key === 'ArrowRight') {
                this.rightArrowPressed = true;
            }
        });
        window.addEventListener('keyup', (event) => {
            if (event.key === 'ArrowUp') {
                this.upArrowPressed = false;
            }
            if (event.key === 'ArrowDown') {
                this.downArrowPressed = false;
            }
            if (event.key === 'ArrowLeft') {
                this.leftArrowPressed = false;
            }
            if (event.key === 'ArrowRight') {
                this.rightArrowPressed = false;
            }
        });
    }

    static checkJoystick() {
        if (this.joystick.pressed) {
            const direction = this.joystick.deltaPosition;
            this.upArrowPressed = direction.y > 0.5;
            this.downArrowPressed = direction.y < -0.5;
            this.leftArrowPressed = direction.x < -0.5;
            this.rightArrowPressed = direction.x > 0.5;
        }
        else {
            this.upArrowPressed = false;
            this.downArrowPressed = false;
            this.leftArrowPressed = false;
            this.rightArrowPressed = false;
        }
    }
}