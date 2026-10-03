import { Component, effect, inject, output, untracked } from '@angular/core';
import { GameRuntimeService } from '../../../core/game-runtime/game-runtime.service';
import { DialogService } from '../../../shared/services/dialog.service';
import { DebugPanelComponent } from '../../debug/debug-panel/debug-panel.component';
import { HealthBarComponent } from '../health-bar/health-bar.component';
import { GameMenuComponent } from '../game-menu/game-menu.component';
import { GameSessionService } from '../game-session.service';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    styleUrl: './game-overlay.component.scss',
    imports: [DebugPanelComponent, HealthBarComponent],
    host: {
        '(window:keydown.escape)': 'onEscape($event)',
    },
})
export class GameOverlayComponent {
    private readonly runtime = inject(GameRuntimeService);
    private readonly dialogs = inject(DialogService);
    protected readonly session = inject(GameSessionService);
    protected readonly playerHealth = this.runtime.playerHealth;
    protected readonly isGameOver = this.runtime.isGameOver;
    protected readonly isPaused = this.runtime.isPaused;
    readonly replay = output<void>();
    readonly mainMenu = output<void>();

    constructor() {
        effect(onCleanup => {
            const mode = this.isGameOver() ? 'game-over' : this.isPaused() ? 'pause' : null;
            if (!mode) {
                return;
            }
            untracked(() => {
                const dialog = this.dialogs.open(GameMenuComponent, 'middle', {
                    inputs: { mode },
                    ariaLabel: mode === 'pause' ? 'Paused' : 'Game Over',
                    closeOnEscape: false,
                });
                dialog.outputs.resume.subscribe(() => this.session.resume());
                dialog.outputs.replay.subscribe(() => this.replay.emit());
                dialog.outputs.mainMenu.subscribe(() => this.mainMenu.emit());
                onCleanup(() => dialog.close());
            });
        });
    }

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
