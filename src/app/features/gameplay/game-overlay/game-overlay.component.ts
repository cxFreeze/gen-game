import { Component, inject } from '@angular/core';
import { DebugPanelComponent } from '../../debug/debug-panel/debug-panel.component';
import { GameUiService } from '../game-ui.service';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    imports: [DebugPanelComponent, LoadingScreenComponent],
})
export class GameOverlayComponent {
    protected readonly gameUiService = inject(GameUiService);
}
