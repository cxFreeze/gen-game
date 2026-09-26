import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { UiComponent } from './ui/ui.component';

@Component({
    selector: 'gg-root',
    imports: [CanvasComponent, UiComponent],
    template: '<gg-canvas /><gg-ui />',
    styleUrl: './app.component.scss',
})
export class AppComponent { }
