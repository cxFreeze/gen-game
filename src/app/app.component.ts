import { Component } from '@angular/core';
import { CanvasComponent } from './game/canvas/canvas.component';
import { GameOverlayComponent } from './game/game-overlay/game-overlay.component';

@Component({
    selector: 'gg-root',
    imports: [CanvasComponent, GameOverlayComponent],
    template: '<gg-canvas /><gg-game-overlay />',
    styleUrl: './app.component.scss',
})
export class AppComponent { }
