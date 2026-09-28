import { Service, signal } from '@angular/core';
import { GameRuntime } from '../../../game/runtime/game-runtime';
import { MenuRuntime } from '../../../game/runtime/menu-runtime';
import type { GameStats } from '../../../game/runtime/game-stats.interface';
import { GameSeed } from '../../../game/runtime/game-seed';

export type { GameStats } from '../../../game/runtime/game-stats.interface';

class EmptyStats implements GameStats {
    readonly fps = 0;
    readonly worldX = 0;
    readonly worldY = 0;
    readonly meshCount = 0;
    readonly polygonCount = 0;
}

class DebugControls {
    readonly isDuckVisible: boolean = true;
    readonly areTreesVisible: boolean = true;
    readonly isSkyView: boolean = false;
}

/** Angular's entry point to the game runtime. UI services never access managers directly. */
@Service()
export class GameRuntimeService {
    private readonly currentSeed = signal('');
    private readonly latestStats = signal<Readonly<GameStats>>(new EmptyStats());
    private readonly debugControls = signal<Readonly<DebugControls>>(new DebugControls());
    private session: object | undefined;
    private readonly menuPreviews = new Map<HTMLCanvasElement, MenuRuntime>();

    readonly seed = this.currentSeed.asReadonly();
    readonly stats = this.latestStats.asReadonly();
    readonly controls = this.debugControls.asReadonly();

    get loaded$() {
        return GameRuntime.hideLoadingScreen$;
    }

    createSeed() {
        const seed = new GameSeed().value;
        this.currentSeed.set(seed);
        return seed;
    }

    async startMenuPreview(canvas: HTMLCanvasElement, animation: 'Idle' | 'Running' = 'Idle') {
        this.stopMenuPreview(canvas);
        const preview = new MenuRuntime(canvas, animation);
        this.menuPreviews.set(canvas, preview);
        try {
            await preview.start();
        }
        catch (error: unknown) {
            if (this.menuPreviews.get(canvas) === preview) {
                this.stopMenuPreview(canvas);
            }
            throw error;
        }
    }

    setMenuPreviewAnimation(canvas: HTMLCanvasElement, animation: 'Idle' | 'Running') {
        this.menuPreviews.get(canvas)?.setAnimation(animation);
    }

    stopMenuPreview(canvas?: HTMLCanvasElement) {
        if (canvas) {
            this.menuPreviews.get(canvas)?.dispose();
            this.menuPreviews.delete(canvas);
            return;
        }
        for (const preview of this.menuPreviews.values()) {
            preview.dispose();
        }
        this.menuPreviews.clear();
    }

    start(canvas: HTMLCanvasElement) {
        const session = {};
        this.session = session;
        this.latestStats.set(new EmptyStats());
        this.debugControls.set(new DebugControls());
        return GameRuntime.start(canvas, stats => {
            if (this.session === session) {
                this.latestStats.set({ ...stats });
            }
        });
    }

    dispose() {
        this.stopMenuPreview();
        this.session = undefined;
        GameRuntime.dispose();
        this.currentSeed.set('');
        this.latestStats.set(new EmptyStats());
        this.debugControls.set(new DebugControls());
    }

    hideShadows() {
        if (GameRuntime.isReady) {
            GameRuntime.debug.deleteShadows();
        }
    }

    toggleDuck() {
        if (!GameRuntime.isReady) {
            return;
        }
        const isDuckVisible = GameRuntime.debug.toggleCharMesh();
        this.debugControls.update(controls => ({ ...controls, isDuckVisible }));
        return isDuckVisible;
    }

    toggleTrees() {
        if (!GameRuntime.isReady) {
            return;
        }
        const areTreesVisible = GameRuntime.debug.toggle3ditems();
        this.debugControls.update(controls => ({ ...controls, areTreesVisible }));
        return areTreesVisible;
    }

    toggleSkyView() {
        if (!GameRuntime.isReady) {
            return;
        }
        const isSkyView = GameRuntime.debug.toggleSkyview();
        this.debugControls.update(controls => ({ ...controls, isSkyView }));
        return isSkyView;
    }
}
