import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { ButtonDirective } from '../../../shared/button/button.directive';

@Component({
    selector: 'gg-game-menu',
    imports: [ButtonDirective],
    template: `
        <dialog #dialog aria-labelledby="game-menu-title" (cancel)="onCancel($event)">
            <h1 id="game-menu-title">{{ mode() === 'pause' ? 'Paused' : 'Game Over' }}</h1>
            <div class="actions">
                @if (mode() === 'pause') {
                    <button gg-button type="button" size="lg" autofocus (click)="resume.emit()">Resume</button>
                }
                <button gg-button type="button" size="lg" [autofocus]="mode() === 'game-over'" (click)="replay.emit()">Replay</button>
                <button gg-button type="button" size="lg" variant="secondary" (click)="mainMenu.emit()">Main Menu</button>
            </div>
        </dialog>
    `,
    styleUrl: './game-menu.component.scss',
})
export class GameMenuComponent {
    private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
    readonly mode = input<'game-over' | 'pause'>('game-over');
    readonly resume = output<void>();
    readonly replay = output<void>();
    readonly mainMenu = output<void>();

    constructor() {
        afterNextRender(() => this.dialog().nativeElement.showModal());
    }

    protected onCancel(event: Event) {
        event.preventDefault();
        if (this.mode() === 'pause') {
            this.resume.emit();
        }
    }
}
