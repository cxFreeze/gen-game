import { DestroyRef, inject, Service } from '@angular/core';
import { Subscription } from 'rxjs';
import { DebugPanelService } from './debug-panel/debug-panel.service';
import { GameEngineService } from './game-engine.service';
import { GameUiStore } from './game-ui.store';

@Service()
export class GameSessionService {
    private readonly gameUiStore = inject(GameUiStore);
    private readonly debugPanelService = inject(DebugPanelService);
    private readonly gameEngine = inject(GameEngineService);
    private loadingSubscription: Subscription | undefined;
    private session: object | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.dispose());
    }

    async start(canvas: HTMLCanvasElement) {
        this.dispose();
        const session = {};
        this.session = session;
        this.gameUiStore.initialize();

        try {
            this.debugPanelService.initialize(this.gameEngine.createSeed());
            const initialization = this.gameEngine.start(canvas, stats => {
                if (this.session !== session) {
                    return;
                }
                this.debugPanelService.updateStats(stats);
            });
            this.loadingSubscription = this.gameEngine.loaded$.subscribe(() => {
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
        this.gameEngine.dispose();
    }
}
