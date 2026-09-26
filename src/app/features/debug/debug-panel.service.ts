import { computed, inject, Service, signal } from '@angular/core';
import { GameEngineService } from '../../core/game-engine/game-engine.service';

@Service()
export class DebugPanelService {
    private readonly gameEngine = inject(GameEngineService);
    private readonly panelDisplayed = signal(false);
    private readonly fpsDisplayed = signal(true);

    readonly isVisible = this.panelDisplayed.asReadonly();
    readonly showFps = this.fpsDisplayed.asReadonly();
    readonly seed = this.gameEngine.seed;
    readonly worldX = computed(() => this.gameEngine.stats().worldX);
    readonly worldY = computed(() => this.gameEngine.stats().worldY);
    readonly meshCount = computed(() => this.gameEngine.stats().meshCount);
    readonly polygonCount = computed(() => this.gameEngine.stats().polygonCount);
    readonly fps = computed(() => this.gameEngine.stats().fps);
    readonly isDuckVisible = computed(() => this.gameEngine.controls().isDuckVisible);
    readonly areTreesVisible = computed(() => this.gameEngine.controls().areTreesVisible);
    readonly isSkyView = computed(() => this.gameEngine.controls().isSkyView);
    readonly worldPosition = computed(() => `${this.worldX().toFixed(0)} / ${this.worldY().toFixed(0)}`);

    togglePanel() {
        this.panelDisplayed.update(isVisible => !isVisible);
    }

    hideShadows() {
        this.gameEngine.hideShadows();
    }

    toggleDuck() {
        this.gameEngine.toggleDuck();
    }

    toggleTrees() {
        this.gameEngine.toggleTrees();
    }

    toggleSkyView() {
        this.gameEngine.toggleSkyView();
    }
}
