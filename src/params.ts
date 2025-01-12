import { Random } from './utils/random';

export class Params {
    // WORLD
    static readonly chunckSize = 400;
    static readonly bchunckSize = 800;
    static readonly worldSize = 12 * 2 * this.chunckSize; // EVEN NUMBER
    static readonly safeDrawWorldSize = Params.worldSize - Params.chunckSize - 30;
    static readonly spawnNoDrawZone = 60;
    static readonly itemLoadBatchSize = 50;

    // PLAYER
    static playerInitX: number = 0;
    static playerInitY: number = 0;

    static initPlayerInitPos() {
        Params.playerInitX = Random.randomNumber('playerInitX') / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;
        Params.playerInitY = Random.randomNumber('playerInitY') / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;
    }
}
