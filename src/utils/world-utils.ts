import { Params } from '../params';

export class WorldUtils {
    static isInWorldBounds(chunkX: number, chunkY: number): boolean {
        const halfWorldSize = (Params.worldSize - Params.chunckSize - 30) / 2;
        return chunkX < halfWorldSize && chunkX > -halfWorldSize && chunkY < halfWorldSize && chunkY > -halfWorldSize;
    }
}