import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { GameSessionService } from '../game-session.service';

@Component({
    selector: 'gg-game-viewport',
    template: '<canvas #renderCanvas id="render-canvas" aria-label="Gen Game 3D viewport"></canvas>',
    styleUrl: './game-viewport.component.scss',
})
export class GameViewportComponent {
    private readonly renderCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('renderCanvas');
    private readonly destroyRef = inject(DestroyRef);
    private readonly gameSession = inject(GameSessionService);

    constructor() {
        afterNextRender(() => this.gameSession.start(this.renderCanvas().nativeElement));
        this.destroyRef.onDestroy(() => this.gameSession.dispose());
    }
}
