import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import '@babylonjs/core/Animations/animatable';
import '@babylonjs/core/Collisions/collisionCoordinator';
import '@babylonjs/core/Debug/debugLayer';
import { DracoCompression } from '@babylonjs/core/Meshes/Compression/index.js';
import '@babylonjs/loaders/glTF';
import { App } from '../../core/app';
import { Random } from '../../utils/random';
import { DebugPanelService } from '../debug-panel/debug-panel.service';
import { GameUiStore } from '../game-ui.store';

DracoCompression.Configuration = {
    decoder: {
        wasmUrl: './babylon-draco-files/draco_wasm_wrapper_gltf.js',
        wasmBinaryUrl: './babylon-draco-files/draco_decoder_gltf.wasm',
        fallbackUrl: './babylon-draco-files/draco_decoder_gltf.js',
    },
};

@Component({
    selector: 'app-canvas',
    template: '<canvas #renderCanvas id="render-canvas" aria-label="Gen Game 3D viewport"></canvas>',
})
export class CanvasComponent {
    private readonly renderCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('renderCanvas');
    private readonly destroyRef = inject(DestroyRef);
    private readonly gameUiStore = inject(GameUiStore);
    private readonly debugPanelService = inject(DebugPanelService);

    constructor() {
        afterNextRender(() => this.startGame());
        this.destroyRef.onDestroy(() => App.disposeApp());
    }

    private async startGame() {
        Random.setSeed();
        this.gameUiStore.initialize();
        this.debugPanelService.initialize(Random.seed);
        App.hideLoadingScreen$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.gameUiStore.finishLoading());

        try {
            await App.initApp(this.renderCanvas().nativeElement, stats => {
                this.gameUiStore.updateStats(stats);
                this.debugPanelService.updateStats(stats);
            });
        }
        catch (error: unknown) {
            this.gameUiStore.failLoading(error);
            console.error(error);
        }
    }
}