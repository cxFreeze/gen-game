import { Service, signal } from '@angular/core';
import { DebugManager } from '../../../engine/runtime/debug';
import { GameRuntime } from '../../../engine/runtime/game-runtime';
import type { GameStats } from '../../../engine/runtime/game-stats';
import { Random } from '../../../engine/utils/random';

export type { GameStats } from '../../../engine/runtime/game-stats';

function createEmptyStats(): Readonly<GameStats> {
    return { fps: 0, worldX: 0, worldY: 0, meshCount: 0, polygonCount: 0 };
}

function createDebugControls() {
    return { isDuckVisible: true, areTreesVisible: true, isSkyView: false };
}

/** Angular's entry point to the game engine. UI services never access managers directly. */
@Service()
export class GameEngineService {
    private readonly currentSeed = signal('');
    private readonly latestStats = signal(createEmptyStats());
    private readonly debugControls = signal<Readonly<ReturnType<typeof createDebugControls>>>(createDebugControls());
    private session: object | undefined;

    readonly seed = this.currentSeed.asReadonly();
    readonly stats = this.latestStats.asReadonly();
    readonly controls = this.debugControls.asReadonly();

    get loaded$() {
        return GameRuntime.hideLoadingScreen$;
    }

    createSeed() {
        Random.setSeed();
        this.currentSeed.set(Random.seed);
        return Random.seed;
    }

    start(canvas: HTMLCanvasElement) {
        const session = {};
        this.session = session;
        this.latestStats.set(createEmptyStats());
        this.debugControls.set(createDebugControls());
        return GameRuntime.start(canvas, stats => {
            if (this.session === session) {
                this.latestStats.set({ ...stats });
            }
        });
    }

    dispose() {
        this.session = undefined;
        GameRuntime.dispose();
        this.currentSeed.set('');
        this.latestStats.set(createEmptyStats());
        this.debugControls.set(createDebugControls());
    }

    hideShadows() {
        if (GameRuntime.isReady) {
            DebugManager.getInstance().deleteShadows();
        }
    }

    toggleDuck() {
        if (!GameRuntime.isReady) {
            return;
        }
        const isDuckVisible = DebugManager.getInstance().toggleCharMesh();
        this.debugControls.update(controls => ({ ...controls, isDuckVisible }));
        return isDuckVisible;
    }

    toggleTrees() {
        if (!GameRuntime.isReady) {
            return;
        }
        const areTreesVisible = DebugManager.getInstance().toggle3ditems();
        this.debugControls.update(controls => ({ ...controls, areTreesVisible }));
        return areTreesVisible;
    }

    toggleSkyView() {
        if (!GameRuntime.isReady) {
            return;
        }
        const isSkyView = DebugManager.getInstance().toggleSkyview();
        this.debugControls.update(controls => ({ ...controls, isSkyView }));
        return isSkyView;
    }
}
