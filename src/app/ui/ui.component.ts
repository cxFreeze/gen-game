import { Component, inject } from '@angular/core';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';
import { GameUiStore } from '../game-ui.store';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    imports: [DebugPanelComponent, LoadingScreenComponent],
})
export class UiComponent {
    protected readonly gameUiStore = inject(GameUiStore);
}
