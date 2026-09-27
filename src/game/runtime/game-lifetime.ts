import { delay, ReplaySubject, take, takeUntil } from 'rxjs';

/** Owns cancellation, loading notifications and deferred work for one game session. */
export class GameLifetime {
    private readonly controller = new AbortController();
    private readonly disposed = new ReplaySubject<void>(1);
    private readonly loaded = new ReplaySubject<void>(1);
    private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
    private hasFinishedLoading = false;
    readonly signal = this.controller.signal;
    readonly disposed$ = this.disposed.asObservable();
    readonly loaded$ = this.loaded.pipe(delay(500), take(1), takeUntil(this.disposed));

    get isReady() {
        return this.hasFinishedLoading && !this.controller.signal.aborted;
    }

    finishLoading() {
        if (this.controller.signal.aborted || this.hasFinishedLoading) {
            return;
        }
        this.hasFinishedLoading = true;
        this.loaded.next();
        this.loaded.complete();
    }

    schedule(callback: () => void, milliseconds: number) {
        if (this.controller.signal.aborted) {
            return;
        }
        const timeout = setTimeout(() => {
            this.timeouts.delete(timeout);
            callback();
        }, milliseconds);
        this.timeouts.add(timeout);
    }

    dispose() {
        if (this.controller.signal.aborted) {
            return;
        }
        this.controller.abort();
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts.clear();
        this.disposed.next();
        this.disposed.complete();
        this.loaded.complete();
    }
}
