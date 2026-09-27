import { Directive, input } from '@angular/core';

@Directive({
    selector: 'button[gg-button]',
    host: {
        'class': 'gg-button',
        '[attr.data-size]': 'size()',
        '[attr.data-variant]': 'variant()',
    },
})
export class ButtonDirective {
    readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
    readonly variant = input<'primary' | 'secondary'>('primary');
}
