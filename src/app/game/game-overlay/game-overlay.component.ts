import { Component, inject } from '@angular/core';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';
import { GameUiStore } from '../game-ui.store';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    imports: [DebugPanelComponent, LoadingScreenComponent],
})
export class GameOverlayComponent {
    protected readonly gameUiStore = inject(GameUiStore);
}
