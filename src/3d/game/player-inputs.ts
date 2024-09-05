import { VirtualJoystick } from '@babylonjs/core';

export abstract class PlayerInputs {

    private static kUpArrowPressed: boolean = false;
    private static kDownArrowPressed: boolean = false;
    private static kLeftArrowPressed: boolean = false;
    private static kRightArrowPressed: boolean = false;

    private static jUpArrowPressed: boolean = false;
    private static jDownArrowPressed: boolean = false;
    private static jLeftArrowPressed: boolean = false;
    private static jRightArrowPressed: boolean = false;

    static get upArrowPressed() {
        return this.kUpArrowPressed || this.jUpArrowPressed;
    }

    static get downArrowPressed() {
        return this.kDownArrowPressed || this.jDownArrowPressed;
    }

    static get leftArrowPressed() {
        return this.kLeftArrowPressed || this.jLeftArrowPressed;
    }

    static get rightArrowPressed() {
        return this.kRightArrowPressed || this.jRightArrowPressed;
    }

    private static joystick: VirtualJoystick;

    static init() {
        this.joystick = new VirtualJoystick(true);
        this.joystick.setJoystickSensibility(10);

        window.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowUp') {
                this.kUpArrowPressed = true;
            }
            if (event.key === 'ArrowDown') {
                this.kDownArrowPressed = true;
            }
            if (event.key === 'ArrowLeft') {
                this.kLeftArrowPressed = true;
            }
            if (event.key === 'ArrowRight') {
                this.kRightArrowPressed = true;
            }
        });
        window.addEventListener('keyup', (event) => {
            if (event.key === 'ArrowUp') {
                this.kUpArrowPressed = false;
            }
            if (event.key === 'ArrowDown') {
                this.kDownArrowPressed = false;
            }
            if (event.key === 'ArrowLeft') {
                this.kLeftArrowPressed = false;
            }
            if (event.key === 'ArrowRight') {
                this.kRightArrowPressed = false;
            }
        });
    }

    static checkJoystick() {
        if (this.joystick.pressed) {
            const direction = this.joystick.deltaPosition;
            this.jUpArrowPressed = direction.y > 0.5;
            this.jDownArrowPressed = direction.y < -0.5;
            this.jLeftArrowPressed = direction.x < -0.5;
            this.jRightArrowPressed = direction.x > 0.5;
        }
        else {
            this.jUpArrowPressed = false;
            this.jDownArrowPressed = false;
            this.jLeftArrowPressed = false;
            this.jRightArrowPressed = false;
        }
    }

}