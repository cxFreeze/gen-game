import type { OutputEmitterRef } from '@angular/core';
import { Component, inject, input, output } from '@angular/core';
import { ButtonDirective } from '../../../shared/button/button.directive';
import { DialogContext } from '../../../shared/services/dialog-context';

@Component({
    selector: 'gg-game-menu',
    imports: [ButtonDirective],
    template: `
        <h1>{{ mode() === 'pause' ? 'Paused' : 'Game Over' }}</h1>
        <div class="actions">
            @if (mode() === 'pause') {
                <button gg-button type="button" size="lg" autofocus (click)="closeMenu(resume)">Resume</button>
            }
            <button gg-button type="button" size="lg" [variant]="mode() === 'pause' ? 'secondary' : 'primary'" [autofocus]="mode() === 'game-over'" (click)="closeMenu(replay)">Replay</button>
            <button gg-button type="button" size="lg" variant="secondary" (click)="closeMenu(mainMenu)">Main Menu</button>
        </div>
    `,
    styleUrl: './game-menu.component.scss',
})
export class GameMenuComponent {
    private readonly dialog = inject(DialogContext);
    readonly mode = input<'game-over' | 'pause'>('game-over');
    readonly resume = output<void>();
    readonly replay = output<void>();
    readonly mainMenu = output<void>();

    protected closeMenu(action: OutputEmitterRef<void>) {
        action.emit();
        this.dialog.close();
    }
}
