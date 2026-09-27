import { worldConfig } from './world-config';
import { Random } from '../../math/random';

export class WorldState {
    readonly playerInitX = Random.randomNumber('playerInitX') / 100 * worldConfig.safeDrawWorldSize - worldConfig.safeDrawWorldSize / 2;
    readonly playerInitY = Random.randomNumber('playerInitY') / 100 * worldConfig.safeDrawWorldSize - worldConfig.safeDrawWorldSize / 2;
}
