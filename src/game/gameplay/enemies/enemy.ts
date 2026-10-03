import { Character } from '../characters/character';
import type { CharacterBody } from '../characters/character-body.interface';
import type { ProjectileSystem } from '../projectiles/projectile-system';
import type { EnemyType } from './enemy-type.interface';
import type { Player } from '../player/player';
import { EnemyMovement } from './enemy-movement';
import { EnemyCombat } from './enemy-combat';
import { Random } from '../../math/random';

export class Enemy extends Character {
    private readonly movement: EnemyMovement;
    private readonly combat: EnemyCombat;
    constructor(
        private readonly enemyBody: CharacterBody,
        private readonly enemyType: EnemyType,
        projectiles: ProjectileSystem,
    ) {
        super(enemyBody, enemyType.stats, projectiles);
        this.rotation = Random.randomNumber(`rotY--${this.position.y}--${this.name}--${this.position.x}`) / 100 * Math.PI * 2;
        this.movement = new EnemyMovement(this, this.position, enemyType);
        this.combat = new EnemyCombat(this.enemyType.stats.range);
    }

    getMovementMode() {
        return this.movement.mode;
    }

    update(player: Player, deltaTime: number) {
        if (this.isDead || this.isDisposed) {
            return;
        }
        const decision = this.combat.prepare(this.position, player.position, !player.isDead, deltaTime,
            () => this.enemyBody.hasLineOfSight(player.position, this.enemyType.stats.range));
        this.movement.update(player.position, !player.isDead, decision.hasClearShot, deltaTime);
        if (decision.shouldAttemptFire) {
            this.tryFire(this.rotation, this.combat.canFire(this.position, this.rotation));
        }
    }
}
