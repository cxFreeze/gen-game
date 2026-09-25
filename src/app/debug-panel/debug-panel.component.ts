import { Component, inject } from '@angular/core';
import { DebugPanelService } from './debug-panel.service';

@Component({
    selector: 'app-debug-panel',
    templateUrl: './debug-panel.component.html',
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