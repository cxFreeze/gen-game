import type { CharacterStats } from './character-stats.interface';

export class CharacterState {
    private readonly maxHealth;
    private readonly fireRate;
    private currentHealth;
    private hasDied = false;
    private lastFireTime = 0;

    constructor(stats: CharacterStats) {
        this.maxHealth = stats.health;
        this.fireRate = stats.fireRate;
        this.currentHealth = stats.health;
    }

    get health() {
        return this.currentHealth;
    }

    get isDead() {
        return this.hasDied;
    }

    takeDamage(damage: number) {
        if (this.hasDied) {
            return;
        }
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, this.currentHealth - damage));
        this.hasDied = this.currentHealth === 0;
    }

    die() {
        this.hasDied = true;
    }

    canFire(now: number, canFire = true): boolean {
        if (this.hasDied || now - this.lastFireTime <= 1000 / this.fireRate || !canFire) {
            return false;
        }
        this.lastFireTime = now;
        return true;
    }
}
