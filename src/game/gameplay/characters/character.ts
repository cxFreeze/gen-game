import type { Position } from '../../math/position';
import type { Projectile } from '../projectiles/projectile';
import type { ProjectileInfos } from '../projectiles/projectile-trajectory';
import { isInWorldBounds } from '../world/world-bounds';
import { worldConfig } from '../world/world-config';
import type { CharacterBody } from './character-body.interface';
import { getDirectionRotation, type CharDirection } from './character-direction';
import { CharacterState } from './character-state';
import type { CharacterStats } from './character-stats.interface';
export interface CharacterOptions {
    body: CharacterBody;
    stats: CharacterStats;
    now: () => number;
    shoot: (infos: ProjectileInfos, owner: string) => void;
}
export class Character {
    private readonly body;
    private readonly stats;
    private readonly now;
    private readonly shoot;
    private readonly state;
    private currentDirection: CharDirection = 'front';
    private hasDisposed = false;

    constructor({ body, stats, now, shoot }: CharacterOptions) {
        this.body = body;
        this.stats = stats;
        this.now = now;
        this.shoot = shoot;
        this.state = new CharacterState(this.stats);
    }

    dispose() {
        if (!this.hasDisposed) {
            this.hasDisposed = true;
            this.body.dispose();
        }
    }

    private tryMove(x: number, z: number, isPositionValid?: (position: Position) => boolean) {
        const oldPosition = { x: this.body.position.x, y: this.body.position.y, z: this.body.position.z };
        this.body.translate(x, z);
        if (this.body.position.y !== oldPosition.y
            || !isInWorldBounds(this.body.position.x, this.body.position.z, worldConfig.safeDrawWorldSize)
            || (isPositionValid && !isPositionValid(this.body.position))) {
            this.body.setPosition(oldPosition);
        }
    }

    moveBy(x: number, z: number, isPositionValid?: (position: Position) => boolean) {
        if (this.state.isDead || this.hasDisposed) {
            return;
        }
        const oldX = this.body.position.x;
        const oldZ = this.body.position.z;
        this.tryMove(x, z, isPositionValid);
        if (this.body.position.x === oldX && this.body.position.z === oldZ && x !== 0 && z !== 0) {
            this.tryMove(x, 0, isPositionValid);
            if (this.body.position.x === oldX) {
                this.tryMove(0, z, isPositionValid);
            }
        }
    }

    takeDamage(damage: number) {
        if (this.hasDisposed || this.state.isDead) {
            return;
        }
        this.state.takeDamage(damage);
        if (this.state.isDead) {
            this.dispose();
        }
    }

    get name() {
        return this.body.name;
    }

    get position() {
        return this.body.position;
    }

    get rotation() {
        return this.body.rotation;
    }

    set rotation(value: number) {
        this.body.rotation = value;
    }

    get isDead() {
        return this.state.isDead;
    }

    get isDisposed() {
        return this.hasDisposed;
    }

    get health() {
        return this.state.health;
    }

    move(x: number, z: number, direction: CharDirection) {
        if (this.state.isDead || this.hasDisposed) {
            return;
        }
        this.moveBy(x, z);
        if (direction !== this.currentDirection) {
            this.currentDirection = direction;
            this.body.rotate(getDirectionRotation(direction));
        }
    }

    tryFire(direction = this.body.rotation, canFire: () => boolean = () => true): boolean {
        if (this.hasDisposed || !this.state.canFire(this.now(), canFire)) {
            return false;
        }
        this.shoot({ speed: this.stats.projectileSpeed, damage: this.stats.damage, range: this.stats.range, direction }, this.body.name);
        return true;
    }

    checkDamageCollisions(projectile: Projectile): boolean {
        if (this.hasDisposed || this.state.isDead || projectile.ownerName === this.body.name || !this.body.intersectsProjectile(projectile.id)) {
            return false;
        }
        this.takeDamage(projectile.damage);
        return true;
    }

    die() {
        this.state.die();
        this.dispose();
    }
}
