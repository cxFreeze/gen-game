import type { CharacterBody, PlayerBody } from './characters/character-body.interface';
import type { ProjectileBody } from './projectiles/projectile-body.interface';
import type { ProjectileInfos } from './projectiles/projectile-trajectory';
import type { EnemyAsset } from './world/asset-types.interface';
import type { WorldLayout } from './world/world-layout';
import type { Position } from '../math/position';

/** Rendering operations implemented by GamePresentation, without game rules. */
export interface GameView {
    createPlayer(position: Position, range: number): PlayerBody;
    createEnemy(name: string, type: EnemyAsset, position: Position): CharacterBody;
    createProjectile(id: string, infos: ProjectileInfos, owner: string): ProjectileBody;
    isEnemySpaceAvailable(name: string, position: Position): boolean;
    initializeWorld(layout: WorldLayout): void;
    loadChunk(chunk: string): void;
    unloadChunk(chunk: string, onUnloaded: () => void, shouldUnload: () => boolean): void;
}
