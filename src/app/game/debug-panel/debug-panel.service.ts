import { computed, inject, Service, signal } from '@angular/core';
import { GameEngineService, type GameStats } from '../game-engine.service';

function createDebugState(seed = '') {
    return {
        seed,
        stats: { fps: 0, worldX: 0, worldY: 0, meshCount: 0, polygonCount: 0 },
        isDuckVisible: true,
        areTreesVisible: true,
        isSkyView: false,
    };
}

@Service()
export class DebugPanelService {
    private readonly gameEngine = inject(GameEngineService);
    private readonly panelVisibility = signal(this.gameEngine.debugDefaults.isVisible);
    private readonly fpsVisibility = signal(this.gameEngine.debugDefaults.showFps);
    private readonly debugState = signal(createDebugState());

    readonly isVisible = this.panelVisibility.asReadonly();
    readonly showFps = this.fpsVisibility.asReadonly();
    readonly seed = computed(() => this.debugState().seed);
    readonly worldX = computed(() => this.debugState().stats.worldX);
    readonly worldY = computed(() => this.debugState().stats.worldY);
    readonly meshCount = computed(() => this.debugState().stats.meshCount);
    readonly polygonCount = computed(() => this.debugState().stats.polygonCount);
    readonly fps = computed(() => this.debugState().stats.fps);
    readonly isDuckVisible = computed(() => this.debugState().isDuckVisible);
    readonly areTreesVisible = computed(() => this.debugState().areTreesVisible);
    readonly isSkyView = computed(() => this.debugState().isSkyView);
    readonly worldPosition = computed(() => `${this.worldX().toFixed(0)} / ${this.worldY().toFixed(0)}`);

    initialize(seed: string) {
        this.panelVisibility.set(this.gameEngine.debugDefaults.isVisible);
        this.fpsVisibility.set(this.gameEngine.debugDefaults.showFps);
        this.debugState.set(createDebugState(seed));
    }

    updateStats(stats: GameStats) {
        this.debugState.update(state => ({ ...state, stats: { ...stats } }));
    }

    togglePanel() {
        this.panelVisibility.update(isVisible => !isVisible);
    }

    hideShadows() {
        this.gameEngine.hideShadows();
    }

    toggleDuck() {
        const isDuckVisible = this.gameEngine.toggleDuck();
        if (isDuckVisible !== undefined) {
            this.debugState.update(state => ({ ...state, isDuckVisible }));
        }
    }

    toggleTrees() {
        const areTreesVisible = this.gameEngine.toggleTrees();
        if (areTreesVisible !== undefined) {
            this.debugState.update(state => ({ ...state, areTreesVisible }));
        }
    }

    toggleSkyView() {
        const isSkyView = this.gameEngine.toggleSkyView();
        if (isSkyView !== undefined) {
            this.debugState.update(state => ({ ...state, isSkyView }));
        }
    }
}
