import { DestroyRef, inject, Service } from '@angular/core';
import { Subscription } from 'rxjs';
import { App } from '../core/app';
import { Random } from '../utils/random';
import { DebugPanelService } from './debug-panel/debug-panel.service';
import { GameUiStore } from './game-ui.store';

@Service()
export class GameSessionService {
    private readonly gameUiStore = inject(GameUiStore);
    private readonly debugPanelService = inject(DebugPanelService);
    private loadingSubscription: Subscription | undefined;
    private session: object | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.dispose());
    }

    async start(canvas: HTMLCanvasElement) {
        this.dispose();
        const session = {};
        this.session = session;
        Random.setSeed();
        this.gameUiStore.initialize();
        this.debugPanelService.initialize(Random.seed);

        try {
            const initialization = App.initApp(canvas, stats => {
                if (this.session !== session) {
                    return;
                }
                this.gameUiStore.updateStats(stats);
                this.debugPanelService.updateStats(stats);
            });
            this.loadingSubscription = App.hideLoadingScreen$.subscribe(() => {
                if (this.session === session) {
                    this.gameUiStore.finishLoading();
                }
            });
            await initialization;
        }
        catch (error: unknown) {
            if (this.session !== session) {
                return;
            }
            this.dispose();
            this.gameUiStore.failLoading(error);
            console.error(error);
        }
    }

    dispose() {
        this.session = undefined;
        this.loadingSubscription?.unsubscribe();
        this.loadingSubscription = undefined;
        App.disposeApp();
    }
}
