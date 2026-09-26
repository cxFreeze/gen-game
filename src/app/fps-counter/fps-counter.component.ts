import { Component, input } from '@angular/core';
import { PanelComponent } from '../shared/panel/panel.component';

@Component({
    selector: 'app-fps-counter',
    imports: [PanelComponent],
    template: '<app-panel>{{ fps() }} fps</app-panel>',
    styleUrl: './fps-counter.component.scss',
})
export class FpsCounterComponent {
    readonly fps = input.required<number>();
}
