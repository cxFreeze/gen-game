import { delay, ReplaySubject, take, takeUntil } from 'rxjs';
import type { ScheduledTask } from './scheduled-task.interface';

/** Owns cancellation, loading notifications and deferred work for one game session. */
export class GameLifetime {
    private readonly controller = new AbortController();
    private readonly disposed = new ReplaySubject<void>(1);
    private readonly loaded = new ReplaySubject<void>(1);
    private readonly scheduledTasks = new Set<ScheduledTask>();
    private hasFinishedLoading = false;
    private isPaused = false;
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
        const task: ScheduledTask = { callback, remainingTime: milliseconds, startedAt: 0, timeout: undefined };
        this.scheduledTasks.add(task);
        if (!this.isPaused) {
            this.startTask(task);
        }
    }

    setPaused(isPaused: boolean) {
        if (this.controller.signal.aborted || this.isPaused === isPaused) {
            return;
        }
        this.isPaused = isPaused;
        for (const task of this.scheduledTasks) {
            if (isPaused) {
                clearTimeout(task.timeout);
                task.timeout = undefined;
                task.remainingTime = Math.max(0, task.remainingTime - (Date.now() - task.startedAt));
            }
            else {
                this.startTask(task);
            }
        }
    }

    private startTask(task: ScheduledTask) {
        task.startedAt = Date.now();
        task.timeout = setTimeout(() => {
            this.scheduledTasks.delete(task);
            task.callback();
        }, task.remainingTime);
    }

    dispose() {
        if (this.controller.signal.aborted) {
            return;
        }
        this.controller.abort();
        this.scheduledTasks.forEach(task => clearTimeout(task.timeout));
        this.scheduledTasks.clear();
        this.disposed.next();
        this.disposed.complete();
        this.loaded.complete();
    }
}
