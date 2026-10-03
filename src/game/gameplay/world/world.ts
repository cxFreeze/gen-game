import type { WorldLayout } from './world-layout';
import { Biomes } from './biomes';
import { BiomeType } from './world-types';
import type { Position } from '../../math/position';
import type { EnemySystem } from '../enemies/enemy-system';
import type { GameView } from '../game-view.interface';

export class World {
    private readonly loadedChunks = new Set<string>();
    private wantedChunks = new Set<string>();
    private pendingChunks: Array<{ chunk: string; shouldLoad: boolean }> = [];
    private chunkDelay = 0;
    private currentChunk: string | undefined;
    private isDisposed = false;

    constructor(
        private readonly layout: WorldLayout,
        private readonly view: GameView,
        private readonly enemies: EnemySystem,
    ) {
        view.initializeWorld(layout);
    }

    private spawnEnemies(chunk: string) {
        const [x, z] = chunk.split('/').map(Number);
        if (!this.layout.isInWorldBounds(x, z)) {
            return;
        }
        const zone = this.layout.getZoneForChunk(chunk);
        const spawns = (zone ? Biomes.zones[zone] : Biomes.biomes[BiomeType.forest]).enemySpawns ?? [];
        for (const spawn of spawns) {
            const count = this.layout.getSpawnNumber(spawn.spawnRate, spawn.enemy, x, z);
            let spawned = 0;
            let attempts = 0;
            while (spawned < count && attempts < count * 100 + 100) {
                const position = this.layout.getRandomPositionInChunk(x, z, spawn.enemy, ++attempts);
                if (this.layout.isTooCloseToPlayerSpawn(position.x, position.y)) {
                    spawned++;
                    continue;
                }
                if (this.enemies.spawnEnemy(spawn.enemy, { x: position.x, y: 0, z: position.y }, chunk, `${spawn.enemy}/${spawned + 1}`)) {
                    spawned++;
                }
            }
        }
    }

    update(position: Position, deltaTime: number) {
        if (this.isDisposed) {
            return;
        }
        const chunk = this.layout.getChunk(position.x, position.z);
        if (chunk !== this.currentChunk) {
            this.queueChunks(chunk);
        }
        if (this.pendingChunks.length === 0) {
            return;
        }
        this.chunkDelay -= deltaTime;
        while (this.chunkDelay <= 0) {
            const next = this.pendingChunks.shift();
            if (!next) {
                break;
            }
            if (next.shouldLoad) {
                this.loadedChunks.add(next.chunk);
                this.view.loadChunk(next.chunk);
                this.spawnEnemies(next.chunk);
            }
            else {
                this.unloadChunk(next.chunk);
            }
            this.chunkDelay += 100;
        }
    }

    private queueChunks(chunk: string) {
        this.currentChunk = chunk;
        this.wantedChunks = new Set(this.layout.getChunksToLoad(chunk));
        this.pendingChunks = [];
        this.chunkDelay = 0;
        for (const loaded of this.loadedChunks) {
            if (!this.wantedChunks.has(loaded)) {
                this.pendingChunks.push({ chunk: loaded, shouldLoad: false });
            }
        }
        for (const next of this.wantedChunks) {
            if (!this.loadedChunks.has(next)) {
                this.pendingChunks.push({ chunk: next, shouldLoad: true });
            }
        }
    }

    private unloadChunk(chunk: string) {
        this.view.unloadChunk(chunk, () => {
            this.loadedChunks.delete(chunk);
            this.enemies.deleteEnemyChunk(chunk);
        }, () => !this.isDisposed && !this.wantedChunks.has(chunk));
    }

    dispose() {
        this.isDisposed = true;
        this.pendingChunks = [];
        this.loadedChunks.clear();
        this.wantedChunks.clear();
    }
}
