import { Enemy } from './enemy';
import { Player } from './player';
import { Projectile } from './projectile';

export class EmeniesManager {
    private loadedEnemies: Enemy[] = [];
    chunckEnemies: { [key: string]: Enemy[] } = {};

    private static instance: EmeniesManager;
    static getInstance(): EmeniesManager {
        if (!this.instance) {
            this.instance = new EmeniesManager();
        }
        return this.instance;
    }

    private player = Player.getInstance();

    addEnemy(enemy: Enemy, chunk: string, enemyNumber: number) {
        if (!this.chunckEnemies[chunk]) {
            this.chunckEnemies[chunk] = [];
        }
        if (enemyNumber <= this.chunckEnemies[chunk].length) {
            if (this.chunckEnemies[chunk][enemyNumber - 1].isDead) {
                enemy.die();
            }
            this.chunckEnemies[chunk].splice(enemyNumber - 1, 1, enemy);
        }
        else {
            this.chunckEnemies[chunk].push(enemy);
        }
        this.loadedEnemies.push(enemy);
    }

    deleteEnemyChunk(chunk: string) {
        if (this.chunckEnemies[chunk]) {
            this.loadedEnemies = this.loadedEnemies.filter(e => !this.chunckEnemies[chunk].includes(e));
            this.chunckEnemies[chunk].forEach(enemy => {
                enemy.delete();
            });
        }
    }

    updateEnemies() {
        this.loadedEnemies = this.loadedEnemies.filter(e => !e.isDead);
        this.loadedEnemies.forEach(enemy => {
            enemy.update(this.player.position, !this.player.isDead);
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
            if (this.loadedEnemies[i].isDead) {
                continue;
            }

            if (origin === this.loadedEnemies[i].name) {
                continue;
            }

            const enemy = this.loadedEnemies[i];
            return enemy.checkDamageCollisions(projectile);
        }

        return false;
    }
}