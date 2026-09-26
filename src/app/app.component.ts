import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { UiComponent } from './ui/ui.component';

@Component({
    selector: 'app-root',
    imports: [CanvasComponent, UiComponent],
    template: '<app-canvas /><app-ui />',
})
export class AppComponent { }