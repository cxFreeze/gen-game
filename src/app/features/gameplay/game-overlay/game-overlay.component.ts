import { Component, inject } from '@angular/core';
import { GameRuntimeService } from '../../../core/game-runtime/game-runtime.service';
import { DebugPanelComponent } from '../../debug/debug-panel/debug-panel.component';
import { HealthBarComponent } from '../health-bar/health-bar.component';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    styleUrl: './game-overlay.component.scss',
    imports: [DebugPanelComponent, HealthBarComponent],
})
export class GameOverlayComponent {
    protected readonly playerHealth = inject(GameRuntimeService).playerHealth;
}
