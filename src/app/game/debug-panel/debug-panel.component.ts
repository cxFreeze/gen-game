import { Component, inject } from '@angular/core';
import { FpsCounterComponent } from '../fps-counter/fps-counter.component';
import { ButtonDirective } from '../../shared/button/button.directive';
import { PanelComponent } from '../../shared/panel/panel.component';
import { DebugPanelService } from './debug-panel.service';

@Component({
    selector: 'gg-debug-panel',
    imports: [PanelComponent, FpsCounterComponent, ButtonDirective],
    templateUrl: './debug-panel.component.html',
    styleUrl: './debug-panel.component.scss',
    host: {
        '(window:keypress)': 'onKeypress($event)',
    },
})
export class DebugPanelComponent {
    protected readonly debugPanelService = inject(DebugPanelService);

    protected onKeypress(event: KeyboardEvent) {
        if (event.key === '$') {
            this.debugPanelService.togglePanel();
        }
    }
}
