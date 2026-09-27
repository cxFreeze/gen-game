import { Character, type CharacterOptions } from '../characters/character';
import type { CharacterBody } from '../characters/character-body.interface';
import type { EnemyType } from './enemy-type.interface';
import type { Player } from '../player/player';
import { EnemyMovement } from './enemy-movement';
import { EnemyCombat } from './enemy-combat';
import { Random } from '../../math/random';

export class Enemy extends Character {
    private readonly movement: EnemyMovement;
    private readonly combat: EnemyCombat;
    private readonly enemyBody: CharacterBody;
    private readonly enemyType: EnemyType;

    constructor(options: Omit<CharacterOptions, 'stats'> & { enemyType: EnemyType }) {
        super({ ...options, stats: options.enemyType.stats });
        this.enemyBody = options.body;
        this.enemyType = options.enemyType;
        this.rotation = Random.randomNumber(`rotY--${this.position.y}--${this.name}--${this.position.x}`) / 100 * Math.PI * 2;
        this.movement = new EnemyMovement(this, this.position, this.enemyType, Random);
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
            this.tryFire(this.rotation, () => this.combat.canFire(this.position, this.rotation));
        }
    }
}
