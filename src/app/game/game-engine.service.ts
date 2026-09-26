import { Service } from '@angular/core';
import { Debug, DebugManager } from '../../engine/runtime/debug';
import { GameRuntime } from '../../engine/runtime/game-runtime';
import type { GameStats } from '../../engine/runtime/game-stats';
import { Random } from '../../engine/utils/random';

export type { GameStats } from '../../engine/runtime/game-stats';

/** Angular's entry point to the game engine. UI services never access managers directly. */
@Service()
export class GameEngineService {
    get debugDefaults() {
        return { isVisible: Debug.showDebugPanel, showFps: Debug.showFps };
    }

    get loaded$() {
        return GameRuntime.hideLoadingScreen$;
    }

    createSeed() {
        Random.setSeed();
        return Random.seed;
    }

    start(canvas: HTMLCanvasElement, updateStats: (stats: GameStats) => void) {
        return GameRuntime.start(canvas, updateStats);
    }

    dispose() {
        GameRuntime.dispose();
    }

    hideShadows() {
        if (GameRuntime.isReady) {
            DebugManager.getInstance().deleteShadows();
        }
    }

    toggleDuck() {
        return GameRuntime.isReady ? DebugManager.getInstance().toggleCharMesh() : undefined;
    }

    toggleTrees() {
        return GameRuntime.isReady ? DebugManager.getInstance().toggle3ditems() : undefined;
    }

    toggleSkyView() {
        return GameRuntime.isReady ? DebugManager.getInstance().toggleSkyview() : undefined;
    }
}
