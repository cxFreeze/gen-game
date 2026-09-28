import { Component, signal } from '@angular/core';
import { GameViewportComponent } from './features/gameplay/game-viewport/game-viewport.component';
import { GameOverlayComponent } from './features/gameplay/game-overlay/game-overlay.component';
import { MainMenuComponent } from './features/main-menu/main-menu.component';

@Component({
    selector: 'gg-root',
    imports: [GameViewportComponent, GameOverlayComponent, MainMenuComponent],
    template: `
        @if (hasStarted()) {
            <gg-game-viewport />
            <gg-game-overlay />
        }
        @else {
            <gg-main-menu (play)="hasStarted.set(true)" />
        }
    `,
    styleUrl: './app.component.scss',
})
export class AppComponent {
    protected readonly hasStarted = signal(false);
}
