import { Enemy } from './enemy';
import { Player } from '../player/player';
import { Projectile } from '../projectiles/projectile';

export class EnemiesManager {
    private loadedEnemies: Enemy[] = [];
    chunkEnemies: { [key: string]: Enemy[] } = {};

    private static instance: EnemiesManager | undefined;
    static dispose() {
        this.instance = undefined;
    }
    static getInstance(): EnemiesManager {
        if (!this.instance) {
            this.instance = new EnemiesManager();
        }
        return this.instance;
    }

    private player = Player.getInstance();

    addEnemy(enemy: Enemy, chunk: string, enemyNumber: number) {
        if (!this.chunkEnemies[chunk]) {
            this.chunkEnemies[chunk] = [];
        }
        if (enemyNumber <= this.chunkEnemies[chunk].length) {
            if (this.chunkEnemies[chunk][enemyNumber - 1].isDead) {
                enemy.die();
            }
            this.chunkEnemies[chunk].splice(enemyNumber - 1, 1, enemy);
        }
        else {
            this.chunkEnemies[chunk].push(enemy);
        }
        this.loadedEnemies.push(enemy);
    }

    deleteEnemyChunk(chunk: string) {
        if (this.chunkEnemies[chunk]) {
            this.loadedEnemies = this.loadedEnemies.filter(e => !this.chunkEnemies[chunk].includes(e));
            this.chunkEnemies[chunk].forEach(enemy => {
                if (enemy.movementMode !== 'passive') {
                    return;
                }
                enemy.delete();
            });
        }
    }

    updateEnemies(deltaTime: number) {
        this.loadedEnemies = this.loadedEnemies.filter(e => !e.isDead);
        this.loadedEnemies.forEach(enemy => {
            enemy.update(this.player.position, !this.player.isDead, deltaTime);
        });
    }

    damageEnemy(name: string, damage: number) {
        const enemy = this.loadedEnemies.find(e => e.name === name);
        if (enemy) {
            enemy.takeDamage(damage);
        }
    }

    checkDamageCollisions(projectile: Projectile): boolean {
        for (let i = 0; i < this.loadedEnemies.length; i++) {
            const enemy = this.loadedEnemies[i];
            if (enemy.checkDamageCollisions(projectile)) {
                return true;
            }
        }
        return false;
    }
}
