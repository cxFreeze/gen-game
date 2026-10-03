import { Component, inject, signal } from '@angular/core';
import { GameViewportComponent } from './features/gameplay/game-viewport/game-viewport.component';
import { GameOverlayComponent } from './features/gameplay/game-overlay/game-overlay.component';
import { GameUiService } from './features/gameplay/game-ui.service';
import { GameSessionService } from './features/gameplay/game-session.service';
import { MainMenuComponent } from './features/main-menu/main-menu.component';

@Component({
    selector: 'gg-root',
    imports: [GameViewportComponent, GameOverlayComponent, MainMenuComponent],
    template: `
        @if (hasStarted()) {
            <gg-game-viewport />
            <gg-game-overlay (replay)="gameSession.replay()" (mainMenu)="hasStarted.set(false)" />
        }
        @if (!hasStarted() || gameUiService.hasLoadingOverlay()) {
            <gg-main-menu
                [mode]="hasStarted() ? 'loading' : 'menu'"
                [error]="gameUiService.loadingError()"
                (play)="hasStarted.set(true)" />
        }
    `,
    styleUrl: './app.component.scss',
})
export class AppComponent {
    protected readonly gameUiService = inject(GameUiService);
    protected readonly gameSession = inject(GameSessionService);
    protected readonly hasStarted = signal(false);
}
