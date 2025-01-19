import { CubicEase, EasingFunction } from '@babylonjs/core/Animations/easing';
import { animationFrames, endWith, map, takeWhile } from 'rxjs';

const ease = new CubicEase();
ease.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);

export class Anim {
    static cubicEaseInOut = ease;

    static tween(start: number, end: number, duration: number) {
        const diff = end - start;
        return animationFrames().pipe(
            map(({ elapsed }) => elapsed / duration),
            takeWhile(v => v < 1),
            endWith(1),
            map(v => v * diff + start)
        );
    }
}



