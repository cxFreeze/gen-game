import type { CharacterBody, PlayerBody } from './characters/character-body.interface';
import type { ProjectileBody } from './projectiles/projectile-body.interface';
import type { ProjectileInfos } from './projectiles/projectile-trajectory';
import type { EnemyAsset } from './world/asset-types.interface';
import type { Position } from '../math/position';

export interface BodyFactory {
    createPlayer(position: Position, range: number): PlayerBody;
    createEnemy(name: string, type: EnemyAsset, position: Position): CharacterBody;
    createProjectile(id: string, infos: ProjectileInfos, owner: string): ProjectileBody;
}
