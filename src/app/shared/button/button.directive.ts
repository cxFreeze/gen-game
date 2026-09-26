import { Directive } from '@angular/core';

@Directive({
    selector: 'button[appButton]',
    host: {
        'class': 'app-button',
    },
})
export class ButtonDirective { }
