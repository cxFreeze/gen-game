import { Character, type CharacterOptions } from '../characters/character';
import type { PlayerBody } from '../characters/character-body.interface';
import { MathUtils } from '../../math/math';
import { getPlayerMovement, type MovementInput } from './player-movement';
import { playerConfig } from './player-config';

export interface PlayerCommands extends MovementInput {
    readonly aimDirection: number;
    readonly isFiring: boolean;
}

export class Player extends Character {
    private hasMoved = false;
    private readonly playerBody: PlayerBody;

    constructor(options: Omit<CharacterOptions, 'stats' | 'body'> & { body: PlayerBody }) {
        super({ ...options, stats: playerConfig.stats });
        this.playerBody = options.body;
    }

    update(commands: PlayerCommands, deltaTime: number) {
        if (this.isDisposed) {
            return { isMoving: false };
        }
        const movement = !this.isDead ? getPlayerMovement(commands, playerConfig.moveSpeed, deltaTime) : null;
        if (movement) {
            this.hasMoved = true;
            this.move(movement.x, movement.z, movement.direction);
        }
        if (commands.isFiring) {
            this.tryFire(MathUtils.normalizeAngle(commands.aimDirection));
        }
        this.playerBody.present({
            hasMoved: this.hasMoved,
            isMoving: movement !== null,
            movementSpeed: playerConfig.moveSpeed,
            aimDirection: commands.aimDirection,
            isFiring: commands.isFiring && !this.isDead,
        });
        return { isMoving: movement !== null };
    }
}
