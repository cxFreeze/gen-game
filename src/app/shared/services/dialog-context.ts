import { signal } from '@angular/core';

export class DialogContext {
    private readonly closed = signal(false);
    readonly isClosed = this.closed.asReadonly();

    constructor(private readonly closeDialog: () => void) { }

    close() {
        if (this.isClosed()) {
            return;
        }
        this.closed.set(true);
        this.closeDialog();
    }
}
