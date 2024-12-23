import { Random } from '../../utils/random';
import { GGA3DAsset } from './assets';

export abstract class WorldUtils {
    // DEVIATION FUNCTIONS

    public static getDeviationX(asset: GGA3DAsset, x: number, y: number): number {
        return 2 * asset.height * (this.randNumberItem(`${asset.name}deviationX`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    public static getDeviationY(asset: GGA3DAsset, x: number, y: number): number {
        return 2 * asset.height * (this.randNumberItem(`${asset.name}deviationY`, x, y) - 50) / 100 * asset.displacementRatio;
    }

    public static getDeviationZ(asset: GGA3DAsset, x: number, y: number, height: number, sizeRatio: number): number {
        return height * sizeRatio * asset.maxVerticalDisplacement! * (WorldUtils.randNumberItem(`${asset.name}deviationZ`, x, y)) / 100;
    }

    public static getSizeRatio(asset: GGA3DAsset, x: number, y: number, useHugeFactor: boolean = true): number {
        const hugeFactor = 3;

        let sizeRatio = asset.sizeRatio * (this.randNumberItem(`${asset.name}sizeRatio`, x, y) - 50) / 50;

        if (sizeRatio < 0) {
            sizeRatio = 1 / (1 - sizeRatio);
        }
        else {
            sizeRatio = 1 + sizeRatio;
        }

        if (useHugeFactor && this.randNumberItem(`${asset.name}huge`, x, y) < 1) {
            sizeRatio = sizeRatio * hugeFactor;
        }

        return sizeRatio;
    }

    // RAND FUNCTIONS
    public static randBoolItem(probability: number, itemType: string, x: number, y: number): boolean {
        return Random.randomBool(itemType + x + y, probability);
    }

    public static randNumberItem(itemType: string, x: number, y: number): number {
        return Random.randomNumber(itemType + x + y);
    }
}
