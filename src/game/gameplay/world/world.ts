import type { WorldLayout } from './world-layout';
import { Biomes } from './biomes';
import { BiomeType } from './world-types';
import type { EnemyAsset } from './asset-types.interface';
import type { Position } from '../../math/position';
import type { Enemy } from '../enemies/enemy';
export interface WorldPresentation {
    initialize(layout: WorldLayout): void;
    loadChunk(chunk: string): void;
    unloadChunk(chunk: string, onUnloaded: () => void, shouldUnload: () => boolean): void;
}

interface WorldOptions {
    layout: WorldLayout;
    presentation: WorldPresentation;
    schedule: (callback: () => void, milliseconds: number) => void;
    createEnemy: (type: EnemyAsset, position: Position) => Enemy;
    isSpaceAvailable: (enemy: Enemy) => boolean;
    addEnemy: (enemy: Enemy, chunk: string, slot: string) => void;
    unloadEnemies: (chunk: string) => void;
}

export class World {
    private readonly options: WorldOptions;
    private readonly loadedChunks = new Set<string>();
    private wantedChunks = new Set<string>();
    private currentChunk: string | undefined;
    private isDisposed = false;

    constructor(options: WorldOptions) {
        this.options = options;
        this.options.presentation.initialize(this.options.layout);
    }

    private spawnEnemies(chunk: string) {
        const [x, z] = chunk.split('/').map(Number);
        if (!this.options.layout.isInWorldBounds(x, z)) {
            return;
        }
        const zone = this.options.layout.getZoneForChunk(chunk);
        const spawns = (zone ? Biomes.zones[zone] : Biomes.biomes[BiomeType.forest]).enemySpawns ?? [];
        for (const spawn of spawns) {
            const count = this.options.layout.getSpawnNumber(spawn.spawnRate, spawn.enemy, x, z);
            let spawned = 0;
            let attempts = 0;
            while (spawned < count && attempts < count * 100 + 100) {
                const position = this.options.layout.getRandomPositionInChunk(x, z, spawn.enemy, ++attempts);
                if (this.options.layout.isTooCloseToPlayerSpawn(position.x, position.y)) {
                    spawned++;
                    continue;
                }
                const enemy = this.options.createEnemy(spawn.enemy, { x: position.x, y: 0, z: position.y });
                if (this.options.isSpaceAvailable(enemy)) {
                    this.options.addEnemy(enemy, chunk, `${spawn.enemy}/${++spawned}`);
                }
                else {
                    enemy.dispose();
                }
            }
        }
    }

    update(position: Position) {
        const chunk = this.options.layout.getChunk(position.x, position.z);
        if (this.isDisposed || chunk === this.currentChunk) {
            return;
        }
        this.currentChunk = chunk;
        this.wantedChunks = new Set(this.options.layout.getChunksToLoad(chunk));
        let delay = 0;
        for (const loaded of this.loadedChunks) {
            if (!this.wantedChunks.has(loaded)) {
                this.options.schedule(() => {
                    if (this.isDisposed || this.wantedChunks.has(loaded)) {
                        return;
                    }
                    this.options.presentation.unloadChunk(loaded, () => {
                        this.loadedChunks.delete(loaded);
                        this.options.unloadEnemies(loaded);
                    }, () => !this.isDisposed && !this.wantedChunks.has(loaded));
                }, delay);
                delay += 100;
            }
        }
        for (const next of this.wantedChunks) {
            if (!this.loadedChunks.has(next)) {
                this.options.schedule(() => {
                    if (this.isDisposed || !this.wantedChunks.has(next) || this.loadedChunks.has(next)) {
                        return;
                    }
                    this.loadedChunks.add(next);
                    this.options.presentation.loadChunk(next);
                    this.spawnEnemies(next);
                }, delay);
                delay += 100;
            }
        }
    }

    dispose() {
        this.isDisposed = true;
        this.loadedChunks.clear();
        this.wantedChunks.clear();
    }
}
