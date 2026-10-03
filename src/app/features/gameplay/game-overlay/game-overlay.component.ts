import { Component, inject, output } from '@angular/core';
import { GameRuntimeService } from '../../../core/game-runtime/game-runtime.service';
import { DebugPanelComponent } from '../../debug/debug-panel/debug-panel.component';
import { HealthBarComponent } from '../health-bar/health-bar.component';
import { GameMenuComponent } from '../game-menu/game-menu.component';
import { GameSessionService } from '../game-session.service';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    styleUrl: './game-overlay.component.scss',
    imports: [DebugPanelComponent, HealthBarComponent, GameMenuComponent],
    host: {
        '(window:keydown.escape)': 'onEscape($event)',
    },
})
export class GameOverlayComponent {
    private readonly runtime = inject(GameRuntimeService);
    protected readonly session = inject(GameSessionService);
    protected readonly playerHealth = this.runtime.playerHealth;
    protected readonly isGameOver = this.runtime.isGameOver;
    protected readonly isPaused = this.runtime.isPaused;
    readonly replay = output<void>();
    readonly mainMenu = output<void>();

    protected onEscape(event: Event) {
        if (!(event instanceof KeyboardEvent) || event.defaultPrevented) {
            return;
        }
        event.preventDefault();
        if (!event.repeat) {
            this.session.togglePause();
        }
    }
}
