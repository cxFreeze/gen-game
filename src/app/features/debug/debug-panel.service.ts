import { computed, inject, Service, signal } from '@angular/core';
import { GameRuntimeService } from '../../core/game-runtime/game-runtime.service';

@Service()
export class DebugPanelService {
    private readonly gameRuntime = inject(GameRuntimeService);
    private readonly panelDisplayed = signal(false);
    private readonly fpsDisplayed = signal(true);

    readonly isVisible = this.panelDisplayed.asReadonly();
    readonly showFps = this.fpsDisplayed.asReadonly();
    readonly seed = this.gameRuntime.seed;
    readonly worldX = computed(() => this.gameRuntime.stats().worldX);
    readonly worldY = computed(() => this.gameRuntime.stats().worldY);
    readonly meshCount = computed(() => this.gameRuntime.stats().meshCount);
    readonly polygonCount = computed(() => this.gameRuntime.stats().polygonCount);
    readonly fps = computed(() => this.gameRuntime.stats().fps);
    readonly isDuckVisible = computed(() => this.gameRuntime.controls().isDuckVisible);
    readonly areTreesVisible = computed(() => this.gameRuntime.controls().areTreesVisible);
    readonly isSkyView = computed(() => this.gameRuntime.controls().isSkyView);
    readonly worldPosition = computed(() => `${this.worldX().toFixed(0)} / ${this.worldY().toFixed(0)}`);

    togglePanel() {
        this.panelDisplayed.update(isVisible => !isVisible);
    }

    hideShadows() {
        this.gameRuntime.hideShadows();
    }

    toggleDuck() {
        this.gameRuntime.toggleDuck();
    }

    toggleTrees() {
        this.gameRuntime.toggleTrees();
    }

    toggleSkyView() {
        this.gameRuntime.toggleSkyView();
    }
}
