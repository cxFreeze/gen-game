import { Component } from '@angular/core';
import { CanvasComponent } from './canvas/canvas.component';
import { DebugPanelComponent } from './debug-panel/debug-panel.component';
import { UiComponent } from './ui/ui.component';

@Component({
    selector: 'app-root',
    imports: [CanvasComponent, UiComponent, DebugPanelComponent],
    template: '<app-canvas /><app-ui /><app-debug-panel />',
})
export class AppComponent { }