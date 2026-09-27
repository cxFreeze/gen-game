import type { Enemy } from './enemy';
import type { Player } from '../player/player';
import type { Projectile } from '../projectiles/projectile';
export class EnemySystem {
    private readonly player: Player;
    private readonly activeEnemies = new Set<Enemy>();
    private readonly chunks = new Map<string, Map<string, Enemy>>();

    constructor(player: Player) {
        this.player = player;
    }

    addEnemy(enemy: Enemy, chunk: string, slot: string) {
        const records = this.chunks.get(chunk) ?? new Map<string, Enemy>();
        this.chunks.set(chunk, records);
        const previous = records.get(slot);
        if (previous?.isDead) {
            enemy.die();
        }
        else if (previous && this.activeEnemies.has(previous)) {
            enemy.dispose();
            return;
        }
        records.set(slot, enemy);
        if (!enemy.isDead) {
            this.activeEnemies.add(enemy);
        }
    }

    deleteEnemyChunk(chunk: string) {
        for (const enemy of this.chunks.get(chunk)?.values() ?? []) {
            if (enemy.getMovementMode() === 'passive') {
                this.activeEnemies.delete(enemy);
                enemy.dispose();
            }
        }
    }

    updateEnemies(deltaTime: number) {
        for (const enemy of this.activeEnemies) {
            if (enemy.isDead) {
                this.activeEnemies.delete(enemy);
            }
            else {
                enemy.update(this.player, deltaTime);
            }
        }
    }

    checkDamageCollisions(projectile: Projectile): boolean {
        for (const enemy of this.activeEnemies) {
            if (enemy.checkDamageCollisions(projectile)) {
                return true;
            }
        }
        return false;
    }

    dispose() {
        for (const records of this.chunks.values()) {
            records.forEach(enemy => enemy.dispose());
        }
        this.activeEnemies.clear();
        this.chunks.clear();
    }
}
