import { Directive } from '@angular/core';

@Directive({
    selector: 'button[gg-button]',
    host: {
        'class': 'gg-button',
    },
})
export class ButtonDirective { }
