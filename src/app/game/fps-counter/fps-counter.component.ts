import { Component, input } from '@angular/core';
import { PanelComponent } from '../../shared/panel/panel.component';

@Component({
    selector: 'gg-fps-counter',
    imports: [PanelComponent],
    template: '<gg-panel>{{ fps() }} fps</gg-panel>',
    styleUrl: './fps-counter.component.scss',
})
export class FpsCounterComponent {
    readonly fps = input.required<number>();
}
