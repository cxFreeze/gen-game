import { delay, ReplaySubject, take, takeUntil } from 'rxjs';

/** Owns cancellation, loading notifications and deferred work for one game session. */
export function createGameLifetime() {
    const controller = new AbortController();
    const disposed = new ReplaySubject<void>(1);
    const loaded = new ReplaySubject<void>(1);
    const timeouts = new Set<ReturnType<typeof setTimeout>>();
    let isReady = false;

    return {
        signal: controller.signal,
        disposed$: disposed.asObservable(),
        loaded$: loaded.pipe(delay(500), take(1), takeUntil(disposed)),
        get isReady() {
            return isReady && !controller.signal.aborted;
        },
        finishLoading() {
            if (controller.signal.aborted || isReady) {
                return;
            }
            isReady = true;
            loaded.next();
            loaded.complete();
        },
        schedule(callback: () => void, milliseconds: number) {
            if (controller.signal.aborted) {
                return;
            }
            const timeout = setTimeout(() => {
                timeouts.delete(timeout);
                callback();
            }, milliseconds);
            timeouts.add(timeout);
        },
        dispose() {
            if (controller.signal.aborted) {
                return;
            }
            controller.abort();
            timeouts.forEach(timeout => clearTimeout(timeout));
            timeouts.clear();
            disposed.next();
            disposed.complete();
            loaded.complete();
        },
    };
}
