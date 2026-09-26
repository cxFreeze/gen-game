import { DestroyRef, inject, Service } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameEngineService } from '../../core/game-engine/game-engine.service';
import { GameUiService } from './game-ui.service';

@Service()
export class GameSessionService {
    private readonly gameUiService = inject(GameUiService);
    private readonly gameEngineService = inject(GameEngineService);
    private loadingSubscription: Subscription | undefined;
    private session: object | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.dispose());
    }

    async start(canvas: HTMLCanvasElement) {
        this.dispose();
        const session = {};
        this.session = session;
        this.gameUiService.initialize();

        try {
            this.gameEngineService.createSeed();
            const initialization = this.gameEngineService.start(canvas);
            this.loadingSubscription = this.gameEngineService.loaded$.subscribe(() => {
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

    dispose() {
        this.session = undefined;
        this.loadingSubscription?.unsubscribe();
        this.loadingSubscription = undefined;
        this.gameEngineService.dispose();
    }
}
