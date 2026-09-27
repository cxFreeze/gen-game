import { Random } from '../math/random';

export class GameSeed {
    readonly value: string;

    constructor() {
        this.value = crypto.randomUUID().split('-')[0];
        Random.setSeed(this.value);
    }
}
