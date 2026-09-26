import { Component } from '@angular/core';
import { GameViewportComponent } from './features/gameplay/game-viewport/game-viewport.component';
import { GameOverlayComponent } from './features/gameplay/game-overlay/game-overlay.component';

@Component({
    selector: 'gg-root',
    imports: [GameViewportComponent, GameOverlayComponent],
    template: '<gg-game-viewport /><gg-game-overlay />',
    styleUrl: './app.component.scss',
})
export class AppComponent { }
