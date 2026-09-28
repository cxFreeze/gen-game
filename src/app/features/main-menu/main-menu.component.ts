import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { GameRuntimeService } from '../../core/game-runtime/game-runtime.service';
import { ButtonDirective } from '../../shared/button/button.directive';

@Component({
    selector: 'gg-main-menu',
    imports: [ButtonDirective],
    host: {
        '[class.loading-screen]': 'mode() === "loading"',
    },
    template: `
        <main aria-labelledby="menu-title">
            <div class="preview" [attr.aria-busy]="isLoading()">
                <canvas #previewCanvas role="img" [attr.aria-label]="mode() === 'loading' ? 'Duck running' : 'Duck idling'"></canvas>
            </div>
            <div class="menu-content">
                <h1 id="menu-title">GEN-GAME</h1>
                @if (mode() === 'loading') {
                    @if (error(); as message) {
                        <p class="status" role="alert">Error</p>
                        <p class="error-message">{{ message }}</p>
                    }
                    @else {
                        <p class="status" role="status">Loading...</p>
                    }
                }
                @else {
                    <button gg-button type="button" size="xl" (click)="play.emit()">Play</button>
                }
            </div>
        </main>
    `,
    styleUrl: './main-menu.component.scss',
})
export class MainMenuComponent {
    private readonly previewCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas');
    private readonly destroyRef = inject(DestroyRef);
    private readonly runtime = inject(GameRuntimeService);
    private canvas: HTMLCanvasElement | undefined;
    protected readonly isLoading = signal(true);
    protected readonly hasPreviewError = signal(false);
    readonly mode = input<'menu' | 'loading'>('menu');
    readonly error = input<string | null>(null);
    readonly play = output<void>();

    constructor() {
        afterNextRender(() => this.loadPreview());
        effect(() => {
            const animation = this.mode() === 'loading' ? 'Running' : 'Idle';
            if (this.canvas) {
                this.runtime.setMenuPreviewAnimation(this.canvas, animation);
            }
        });
        this.destroyRef.onDestroy(() => {
            if (this.canvas) {
                this.runtime.stopMenuPreview(this.canvas);
            }
        });
    }

    private async loadPreview() {
        if (this.destroyRef.destroyed) {
            return;
        }
        this.canvas = this.previewCanvas().nativeElement;
        try {
            await this.runtime.startMenuPreview(this.canvas, this.mode() === 'loading' ? 'Running' : 'Idle');
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
