import { computed, Service, signal } from '@angular/core';
import { GameStats } from '../../core/app';
import { Debug, DebugManager } from '../../core/debug';

@Service()
export class DebugPanelService {
    readonly isVisible = signal(Debug.showDebugPanel);
    readonly seed = signal('');
    readonly worldX = signal(0);
    readonly worldY = signal(0);
    readonly meshCount = signal(0);
    readonly polygonCount = signal(0);
    readonly isDuckVisible = signal(true);
    readonly areTreesVisible = signal(true);
    readonly isSkyView = signal(false);

    readonly worldPosition = computed(() => `${this.worldX().toFixed(0)} / ${this.worldY().toFixed(0)}`);

    private readonly debugManager = DebugManager.getInstance();

    initialize(seed: string) {
        this.seed.set(seed);
    }

    updateStats(stats: GameStats) {
        this.worldX.set(stats.worldX);
        this.worldY.set(stats.worldY);
        this.meshCount.set(stats.meshCount);
        this.polygonCount.set(stats.polygonCount);
    }

    togglePanel() {
        this.isVisible.update(isVisible => !isVisible);
    }

    hideShadows() {
        this.debugManager.deleteShadows();
    }

    toggleDuck() {
        this.debugManager.toggleCharMesh();
        this.isDuckVisible.update(isVisible => !isVisible);
    }

    toggleTrees() {
        this.debugManager.toggle3ditems();
        this.areTreesVisible.update(isVisible => !isVisible);
    }

    toggleSkyView() {
        this.debugManager.toggleSkyview();
        this.isSkyView.update(isEnabled => !isEnabled);
    }
}