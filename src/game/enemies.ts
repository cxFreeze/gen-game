import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { Enemy } from './enemy';
import { Player } from './player';

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

    constructor() {

    }

    addEnemy(enemy: Enemy, chunk: string) {
        if (!this.chunckEnemies[chunk]) {
            this.chunckEnemies[chunk] = [];
        }
        this.chunckEnemies[chunk].push(enemy);
        this.loadedEnemies.push(enemy);
    }

    deleteEnemyChunk(chunk: string) {
        if (this.chunckEnemies[chunk]) {
            this.loadedEnemies = this.loadedEnemies.filter(e => !this.chunckEnemies[chunk].includes(e));
            this.chunckEnemies[chunk] = [];
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

    checkCollisions(mesh: AbstractMesh, origin: string, damage: number): boolean {
        if (origin !== 'player') {
            mesh.computeWorldMatrix(true);
            this.player.mesh.computeWorldMatrix(true);

            if (this.player.mesh.intersectsMesh(mesh, true)) {
                this.player.takeDamage(damage);
                return true;
            }

            return false;
        }

        for (let i = 0; i < this.loadedEnemies.length; i++) {
            if (this.loadedEnemies[i].isDead) {
                continue;
            }

            if (origin === this.loadedEnemies[i].name) {
                continue;
            }

            const enemy = this.loadedEnemies[i];

            mesh.computeWorldMatrix(true);
            enemy.mesh.computeWorldMatrix(true);

            if (enemy.mesh.intersectsMesh(mesh, true)) {
                this.damageEnemy(enemy.name, damage);
                return true;
            }
        }

        return false;
    }
}