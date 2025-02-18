import { VirtualJoystick } from '@babylonjs/core/Misc/virtualJoystick';
import { Subject } from 'rxjs';
import { DebugManager } from '../core/debug';

export class PlayerInputs {

    private static disableJoystick: boolean = true;

    private static kUpArrowPressed: boolean = false;
    private static kDownArrowPressed: boolean = false;
    private static kLeftArrowPressed: boolean = false;
    private static kRightArrowPressed: boolean = false;
    private static kSpacePressed: boolean = false;

    private static jUpArrowPressed: boolean = false;
    private static jDownArrowPressed: boolean = false;
    private static jLeftArrowPressed: boolean = false;
    private static jRightArrowPressed: boolean = false;

    static spacePressed = new Subject<void>();

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
        const debugManager = DebugManager.getInstance();

        if (!this.disableJoystick) {
            this.joystick = new VirtualJoystick(true);
            this.joystick.setJoystickSensibility(10);
        }

        window.addEventListener('keydown', (event) => {
            if (event.key === ' ') {
                this.kSpacePressed = true;
            }
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
            if (event.key === ' ') {
                this.kSpacePressed = false;
            }
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

        window.addEventListener('keypress', (event) => {
            if (event.key === '$') {
                debugManager.toggleDebugPanel();
            }
        });
    }

    static checkInputs() {
        if (this.kSpacePressed) {
            this.spacePressed.next();
        }
        if (this.disableJoystick) {
            return;
        }
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