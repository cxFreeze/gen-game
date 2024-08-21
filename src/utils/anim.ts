import { animationFrames, endWith, map, takeWhile } from "rxjs";

export abstract class Anim {

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



