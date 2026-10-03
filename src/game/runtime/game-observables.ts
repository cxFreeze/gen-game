import { BehaviorSubject } from 'rxjs';
import type { GameStats } from './game-stats.interface';
import type { PlayerHealth } from './player-health.interface';

const emptyDebugStats: Readonly<GameStats> = {
    fps: 0,
    worldX: 0,
    worldY: 0,
    meshCount: 0,
    polygonCount: 0,
};
const debugStats = new BehaviorSubject<Readonly<GameStats>>(emptyDebugStats);
const emptyPlayerHealth: PlayerHealth = { current: 0, max: 0 };
const playerHealth = new BehaviorSubject<PlayerHealth>(emptyPlayerHealth);

export const debugStats$ = debugStats.asObservable();
export const playerHealth$ = playerHealth.asObservable();

export function publishPlayerHealth(health: PlayerHealth) {
    const previousHealth = playerHealth.value;
    if (health.current !== previousHealth.current || health.max !== previousHealth.max) {
        playerHealth.next({ ...health });
    }
}

export function resetPlayerHealth() {
    playerHealth.next(emptyPlayerHealth);
}

export function publishDebugStats(stats: Readonly<GameStats>) {
    debugStats.next({ ...stats });
}

export function resetDebugStats() {
    debugStats.next(emptyDebugStats);
}
