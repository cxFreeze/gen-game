import { Component, inject } from '@angular/core';
import { Debug } from '../../core/debug';
import { GameUiStore } from '../game-ui.store';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
})
export class UiComponent {
    protected readonly gameUiStore = inject(GameUiStore);

    protected readonly showFps = Debug.showFps;
}