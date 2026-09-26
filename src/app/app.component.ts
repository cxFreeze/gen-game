import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { UiComponent } from './ui/ui.component';

@Component({
    selector: 'app-root',
    imports: [CanvasComponent, UiComponent],
    template: '<app-canvas /><app-ui />',
    styleUrl: './app.component.scss',
})
export class AppComponent { }
