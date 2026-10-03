import { DestroyRef, inject, Service } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameRuntimeService } from '../../core/game-runtime/game-runtime.service';
import { GameUiService } from './game-ui.service';

@Service()
export class GameSessionService {
    private readonly gameUiService = inject(GameUiService);
    private readonly gameRuntimeService = inject(GameRuntimeService);
    private loadingSubscription: Subscription | undefined;
    private session: object | undefined;
    private canvas: HTMLCanvasElement | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.dispose());
    }

    async start(canvas: HTMLCanvasElement) {
        if (this.session) {
            this.dispose();
        }
        const session = {};
        this.session = session;
        this.canvas = canvas;
        this.gameUiService.initialize();

        try {
            this.gameRuntimeService.createSeed();
            const initialization = this.gameRuntimeService.start(canvas);
            this.loadingSubscription = this.gameRuntimeService.loaded$.subscribe(() => {
                if (this.session === session) {
                    this.gameUiService.finishLoading();
                }
            });
            await initialization;
        }
        catch (error: unknown) {
            if (this.session !== session) {
                return;
            }
            this.dispose();
            this.gameUiService.failLoading(error);
            console.error(error);
        }
    }

    async replay() {
        const canvas = this.canvas;
        if (canvas) {
            await this.start(canvas);
        }
    }

    togglePause() {
        if (!this.session || this.gameUiService.hasLoadingOverlay() || this.gameRuntimeService.isGameOver()) {
            return;
        }
        this.gameRuntimeService.setPaused(!this.gameRuntimeService.isPaused());
    }

    resume() {
        this.gameRuntimeService.setPaused(false);
    }

    dispose() {
        this.session = undefined;
        this.canvas = undefined;
        this.loadingSubscription?.unsubscribe();
        this.loadingSubscription = undefined;
        this.gameRuntimeService.dispose();
    }
}
