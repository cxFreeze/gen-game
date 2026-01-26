import { ZoneType } from '../models/interfaces';
import { Random } from '../utils/random';

export class Params {

    //DEV
    private static devMode = true;

    private static halfWorldSizeChunks = 16;

    // LOADING
    static readonly framesWithoutDraw = 100;

    // WORLD
    static readonly chunckSize = 500;
    static readonly bchunckSize = 2 * this.chunckSize;
    static readonly worldSize = Params.halfWorldSizeChunks * 2 * this.chunckSize; // EVEN NUMBER
    static readonly safeDrawWorldSize = Params.worldSize - Params.chunckSize - 30;
    static readonly spawnNoDrawZone = 50;
    static readonly itemLoadBatchSize = 50;
    static readonly hugeSizeRatio = 3;
    static readonly hugeSizeChance = 5; // out of 1000

    static readonly zoneCount: { [key in ZoneType]: number } = {
        [ZoneType.town]: 3 * (Params.halfWorldSizeChunks * Params.halfWorldSizeChunks) / 16
    };

    // ENEMY
    static enemyNameCount = 0;
    static spawnMinDistanceFromPlayerSpawn = 1500;

    // PLAYER
    static playerInitX: number = 0;
    static playerInitY: number = 0;
    static playerMoveSpeed: number = 85; // px per second

    static initPlayerInitPos() {
        Params.playerInitX = Random.randomNumber('playerInitX') / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;
        Params.playerInitY = Random.randomNumber('playerInitY') / 100 * Params.safeDrawWorldSize - Params.safeDrawWorldSize / 2;
        if (this.devMode) {
            this.initDevMode();
        }
    }

    static initDevMode() {
        Params.halfWorldSizeChunks = 2;
        Params.zoneCount[1] = 2;
        Params.spawnMinDistanceFromPlayerSpawn = 200;
    }
}
