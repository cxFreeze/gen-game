import { Enemy } from './enemy';
import { EnemyTypes } from './enemy-types';
import type { Player } from '../player/player';
import type { Projectile } from '../projectiles/projectile';
import type { ProjectileSystem } from '../projectiles/projectile-system';
import type { GameView } from '../game-view.interface';
import type { EnemyAsset } from '../world/asset-types.interface';
import type { Position } from '../../math/position';

export class EnemySystem {
    private enemyCount = 0;
    private readonly activeEnemies = new Set<Enemy>();
    private readonly chunks = new Map<string, Map<string, Enemy>>();

    constructor(
        private readonly player: Player,
        private readonly projectiles: ProjectileSystem,
        private readonly view: GameView,
    ) {}

    spawnEnemy(type: EnemyAsset, position: Position, chunk: string, slot: string): boolean {
        const name = `char-${type}${this.enemyCount++}`;
        const body = this.view.createEnemy(name, type, position);
        const enemy = new Enemy(body, EnemyTypes[type], this.projectiles);
        if (!this.view.isEnemySpaceAvailable(name, enemy.position)) {
            enemy.dispose();
            return false;
        }
        this.addEnemy(enemy, chunk, slot);
        return true;
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
