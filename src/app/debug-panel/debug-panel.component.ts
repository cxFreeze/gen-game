import { Component, inject } from '@angular/core';
import { PanelComponent } from '../shared/panel/panel.component';
import { DebugPanelService } from './debug-panel.service';

@Component({
    selector: 'app-debug-panel',
    imports: [PanelComponent],
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
