import { BehaviorSubject } from 'rxjs';
import type { GameStats } from './game-stats.interface';

const emptyDebugStats: Readonly<GameStats> = {
    fps: 0,
    worldX: 0,
    worldY: 0,
    meshCount: 0,
    polygonCount: 0,
};
const debugStats = new BehaviorSubject<Readonly<GameStats>>(emptyDebugStats);

export const debugStats$ = debugStats.asObservable();

export function publishDebugStats(stats: Readonly<GameStats>) {
    debugStats.next({ ...stats });
}

export function resetDebugStats() {
    debugStats.next(emptyDebugStats);
}
