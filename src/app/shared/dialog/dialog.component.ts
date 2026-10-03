import { Component, ElementRef, ViewContainerRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { PanelComponent } from '../panel/panel.component';
import { DialogContext } from '../services/dialog-context';
import type { DialogPosition } from '../services/dialog.interface';

@Component({
    selector: 'dialog[gg-dialog]',
    imports: [PanelComponent],
    template: '<gg-panel><ng-template #content /></gg-panel>',
    styleUrl: './dialog.component.scss',
    host: {
        '[attr.data-position]': 'position()',
        '[attr.aria-label]': 'ariaLabel()',
        '(keydown.escape)': 'onEscape($event)',
        '(cancel)': 'onCancel($event)',
        '(close)': 'context.close()',
    },
})
export class DialogComponent {
    protected readonly context = inject(DialogContext);
    private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef);
    readonly content = viewChild.required('content', { read: ViewContainerRef });
    readonly position = input<DialogPosition>('middle');
    readonly ariaLabel = input<string | null>(null);
    readonly closeOnEscape = input(true);

    constructor() {
        afterNextRender(() => {
            if (!this.context.isClosed()) {
                this.element.nativeElement.showModal();
            }
        });
    }

    protected onCancel(event: Event) {
        event.preventDefault();
        if (this.closeOnEscape()) {
            this.context.close();
        }
    }

    protected onEscape(event: Event) {
        if (this.closeOnEscape()) {
            event.stopPropagation();
            if (event instanceof KeyboardEvent && event.repeat) {
                event.preventDefault();
            }
        }
    }
}
