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

    private static mLeftPressed: boolean = false;

    private static jUpArrowPressed: boolean = false;
    private static jDownArrowPressed: boolean = false;
    private static jLeftArrowPressed: boolean = false;
    private static jRightArrowPressed: boolean = false;

    private static cursorDirection: number = 0;

    static readonly firePressed = new Subject<number>();
    static readonly aimChanged = new Subject<number>();

    static get forwardPressed() {
        return this.kUpArrowPressed || this.jUpArrowPressed;
    }

    static get backwardsPressed() {
        return this.kDownArrowPressed || this.jDownArrowPressed;
    }

    static get leftPressed() {
        return this.kLeftArrowPressed || this.jLeftArrowPressed;
    }

    static get rightPressed() {
        return this.kRightArrowPressed || this.jRightArrowPressed;
    }

    private static joystick: VirtualJoystick;

    static init() {
        const debugManager = DebugManager.getInstance();

        if (!this.disableJoystick) {
            this.joystick = new VirtualJoystick(true);
            this.joystick.setJoystickSensibility(10);
        }

        this.initCursorTracking();

        addEventListener('pointerdown', () => {
            this.mLeftPressed = true;
        });

        addEventListener('pointerup', () => {
            this.mLeftPressed = false;
        });

        window.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'Space':
                    this.kSpacePressed = true;
                    break;
                case 'ArrowUp':
                    this.kUpArrowPressed = true;
                    break;
                case 'KeyW':
                    this.kUpArrowPressed = true;
                    break;
                case 'ArrowDown':
                    this.kDownArrowPressed = true;
                    break;
                case 'KeyS':
                    this.kDownArrowPressed = true;
                    break;
                case 'ArrowLeft':
                    this.kLeftArrowPressed = true;
                    break;
                case 'KeyA':
                    this.kLeftArrowPressed = true;
                    break;
                case 'ArrowRight':
                    this.kRightArrowPressed = true;
                    break;
                case 'KeyD':
                    this.kRightArrowPressed = true;
                    break;
            }
        });

        window.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'Space':
                    this.kSpacePressed = false;
                    break;
                case 'ArrowUp':
                    this.kUpArrowPressed = false;
                    break;
                case 'KeyW':
                    this.kUpArrowPressed = false;
                    break;
                case 'ArrowDown':
                    this.kDownArrowPressed = false;
                    break;
                case 'KeyS':
                    this.kDownArrowPressed = false;
                    break;
                case 'ArrowLeft':
                    this.kLeftArrowPressed = false;
                    break;
                case 'KeyA':
                    this.kLeftArrowPressed = false;
                    break;
                case 'ArrowRight':
                    this.kRightArrowPressed = false;
                    break;
                case 'KeyD':
                    this.kRightArrowPressed = false;
                    break;
            }
        });

        window.addEventListener('keypress', (event) => {
            if (event.key === '$') {
                debugManager.toggleDebugPanel();
            }
        });
    }

    static checkInputs() {
        if (this.kSpacePressed || this.mLeftPressed) {
            this.firePressed.next(this.cursorDirection);
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

    private static updateCursorDirection(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        const centerX = window.innerWidth / 2;
        const centerY = (window.innerHeight / 2) * 0.95;

        const dx = event.clientX - centerX;
        const dy = centerY - event.clientY;

        const angle = Math.atan2(dy, dx) - Math.PI / 2;

        this.cursorDirection = angle;
        this.aimChanged.next(angle);
    }

    private static initCursorTracking() {
        window.addEventListener('pointermove', this.updateCursorDirection.bind(this));
    }

}