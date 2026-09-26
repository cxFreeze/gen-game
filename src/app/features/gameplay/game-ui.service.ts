import { computed, Service, signal } from '@angular/core';

export type GameLoadingState =
    | { readonly status: 'loading' }
    | { readonly status: 'ready' }
    | { readonly status: 'error', readonly message: string };


@Service()
export class GameUiService {
    private readonly loadingState = signal<GameLoadingState>({ status: 'loading' });

    readonly state = this.loadingState.asReadonly();
    readonly status = computed(() => this.state().status);
    readonly isLoading = computed(() => this.status() === 'loading');
    readonly hasLoadingOverlay = computed(() => this.status() !== 'ready');
    readonly loadingError = computed(() => {
        const state = this.state();
        return state.status === 'error' ? state.message : null;
    });

    initialize() {
        this.loadingState.set({ status: 'loading' });
    }

    finishLoading() {
        if (this.isLoading()) {
            this.loadingState.set({ status: 'ready' });
        }
    }

    failLoading(error: unknown) {
        const message = error instanceof Error ? error.message : 'Unable to initialize the game';
        this.loadingState.set({ status: 'error', message });
    }

}
