import { Component, inject } from '@angular/core';
import { Debug } from '../../core/debug';
import { DebugPanelComponent } from '../debug-panel/debug-panel.component';
import { FpsCounterComponent } from '../fps-counter/fps-counter.component';
import { GameUiStore } from '../game-ui.store';
import { LoadingScreenComponent } from '../loading-screen/loading-screen.component';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    imports: [DebugPanelComponent, FpsCounterComponent, LoadingScreenComponent],
})
export class UiComponent {
    protected readonly gameUiStore = inject(GameUiStore);

    protected readonly showFps = Debug.showFps;
}
