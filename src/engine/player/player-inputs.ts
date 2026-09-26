import { VirtualJoystick } from '@babylonjs/core/Misc/virtualJoystick.js';
import { Subject } from 'rxjs';

export class PlayerInputs {
    private static readonly disableJoystick = true;
    private static readonly pressedKeys = new Set<string>();
    private static readonly pressedPointers = new Set<number>();
    private static jUpArrowPressed = false;
    private static jDownArrowPressed = false;
    private static jLeftArrowPressed = false;
    private static jRightArrowPressed = false;
    private static cursorDirection = 0;
    private static controller: AbortController | undefined;
    private static joystick: VirtualJoystick | undefined;
    private static canvas: HTMLCanvasElement | undefined;

    static readonly firePressed = new Subject<number>();
    static readonly aimChanged = new Subject<number>();

    static get forwardPressed() {
        return this.pressedKeys.has('ArrowUp') || this.pressedKeys.has('KeyW') || this.jUpArrowPressed;
    }

    static get backwardsPressed() {
        return this.pressedKeys.has('ArrowDown') || this.pressedKeys.has('KeyS') || this.jDownArrowPressed;
    }

    static get leftPressed() {
        return this.pressedKeys.has('ArrowLeft') || this.pressedKeys.has('KeyA') || this.jLeftArrowPressed;
    }

    static get rightPressed() {
        return this.pressedKeys.has('ArrowRight') || this.pressedKeys.has('KeyD') || this.jRightArrowPressed;
    }

    static init(canvas: HTMLCanvasElement) {
        this.dispose();
        this.canvas = canvas;
        this.controller = new AbortController();
        const options = { signal: this.controller.signal };

        if (!this.disableJoystick) {
            this.joystick = new VirtualJoystick(true);
            this.joystick.setJoystickSensibility(10);
        }

        canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0) {
                return;
            }
            this.updateCursorDirection(event);
            this.pressedPointers.add(event.pointerId);
        }, options);
        const releasePointer = (event: PointerEvent) => this.pressedPointers.delete(event.pointerId);
        window.addEventListener('pointerup', releasePointer, options);
        window.addEventListener('pointercancel', releasePointer, options);
        canvas.addEventListener('pointermove', event => this.updateCursorDirection(event), options);

        window.addEventListener('keydown', event => {
            if (event.defaultPrevented || this.isInteractiveTarget(event)) {
                return;
            }
            this.pressedKeys.add(event.code);
        }, options);
        window.addEventListener('keyup', event => this.pressedKeys.delete(event.code), options);
        window.addEventListener('blur', () => this.resetPressedInputs(), options);
        window.addEventListener('focusin', event => {
            if (this.isInteractiveTarget(event)) {
                this.resetPressedInputs();
            }
        }, options);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.resetPressedInputs();
            }
        }, options);
    }

    static dispose() {
        this.controller?.abort();
        this.controller = undefined;
        this.joystick?.releaseCanvas();
        this.joystick = undefined;
        this.canvas = undefined;
        this.resetPressedInputs();
        this.cursorDirection = 0;
    }

    static checkInputs() {
        if (!this.controller) {
            return;
        }
        if (this.pressedKeys.has('Space') || this.pressedPointers.size > 0) {
            this.firePressed.next(this.cursorDirection);
        }
        const direction = this.joystick?.pressed ? this.joystick.deltaPosition : undefined;
        this.jUpArrowPressed = direction !== undefined && direction.y > 0.5;
        this.jDownArrowPressed = direction !== undefined && direction.y < -0.5;
        this.jLeftArrowPressed = direction !== undefined && direction.x < -0.5;
        this.jRightArrowPressed = direction !== undefined && direction.x > 0.5;
    }

    private static resetPressedInputs() {
        this.pressedKeys.clear();
        this.pressedPointers.clear();
        this.jUpArrowPressed = false;
        this.jDownArrowPressed = false;
        this.jLeftArrowPressed = false;
        this.jRightArrowPressed = false;
    }

    private static isInteractiveTarget(event: Event) {
        return event.composedPath().some(target => target instanceof HTMLElement
            && (target.isContentEditable || target.matches('button, input, textarea, select, a[href], [role="button"]')));
    }

    private static updateCursorDirection(event: PointerEvent) {
        if (!this.canvas) {
            return;
        }
        const bounds = this.canvas.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2 * 0.95;
        const dx = event.clientX - centerX;
        const dy = centerY - event.clientY;
        this.cursorDirection = Math.atan2(dy, dx) - Math.PI / 2;
        this.aimChanged.next(this.cursorDirection);
    }
}
