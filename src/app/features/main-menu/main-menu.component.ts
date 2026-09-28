import { Component, DestroyRef, ElementRef, afterNextRender, inject, output, signal, viewChild } from '@angular/core';
import { GameRuntimeService } from '../../core/game-runtime/game-runtime.service';
import { ButtonDirective } from '../../shared/button/button.directive';

@Component({
    selector: 'gg-main-menu',
    imports: [ButtonDirective],
    template: `
        <main aria-labelledby="menu-title">
            <div class="preview" [attr.aria-busy]="isLoading()">
                <canvas #previewCanvas role="img" aria-label="Duck idling"></canvas>
            </div>
            <div class="menu-content">
                <h1 id="menu-title">GEN-GAME</h1>
                <button gg-button type="button" size="xl" (click)="play.emit()">Jouer</button>
            </div>
        </main>
    `,
    styleUrl: './main-menu.component.scss',
})
export class MainMenuComponent {
    private readonly previewCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas');
    private readonly destroyRef = inject(DestroyRef);
    private readonly runtime = inject(GameRuntimeService);
    protected readonly isLoading = signal(true);
    protected readonly hasPreviewError = signal(false);
    readonly play = output<void>();

    constructor() {
        afterNextRender(() => this.loadPreview());
        this.destroyRef.onDestroy(() => this.runtime.stopMenuPreview());
    }

    private async loadPreview() {
        try {
            await this.runtime.startMenuPreview(this.previewCanvas().nativeElement);
        }
        catch {
            if (!this.destroyRef.destroyed) {
                this.hasPreviewError.set(true);
            }
        }
        finally {
            if (!this.destroyRef.destroyed) {
                this.isLoading.set(false);
            }
        }
    }
}
