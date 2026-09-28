import { Component } from '@angular/core';
import { DebugPanelComponent } from '../../debug/debug-panel/debug-panel.component';

@Component({
    selector: 'gg-game-overlay',
    templateUrl: './game-overlay.component.html',
    imports: [DebugPanelComponent],
})
export class GameOverlayComponent { }
