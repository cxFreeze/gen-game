
export class MathUtils {

    static normalizeAngle(angle: number): number {
        angle = angle % (2 * Math.PI);
        return angle < 0 ? angle + 2 * Math.PI : angle;
    }
}

