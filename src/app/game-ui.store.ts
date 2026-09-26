import { Service, signal } from '@angular/core';
import { GameStats } from '../core/app';

@Service()
export class GameUiStore {
    readonly isLoading = signal(true);
    readonly loadingError = signal<string | null>(null);
    readonly fps = signal(0);

    initialize() {
        this.isLoading.set(true);
        this.loadingError.set(null);
        this.fps.set(0);
    }

    updateStats(stats: GameStats) {
        this.fps.set(stats.fps);
    }

    finishLoading() {
        this.isLoading.set(false);
    }

    failLoading(error: unknown) {
        const message = error instanceof Error ? error.message : 'Unable to initialize the game';
        this.loadingError.set(message);
    }

}
