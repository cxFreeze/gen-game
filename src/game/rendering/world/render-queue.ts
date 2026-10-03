/** Processes scene work in batches and announces the first completed generation. */
export class RenderQueue {
    private readonly tasks: Array<() => void> = [];
    private hasStarted = false;
    private isReady = false;
    private idleFrames = 0;

    constructor(private readonly batchSize: number, private readonly idleFrameCount: number) {}

    enqueue(task: () => void) {
        this.tasks.push(task);
    }

    processFrame(): boolean {
        for (let index = 0; index < this.batchSize; index++) {
            const task = this.tasks.shift();
            if (!task) {
                if (this.hasStarted && !this.isReady && ++this.idleFrames > this.idleFrameCount) {
                    this.isReady = true;
                    return true;
                }
                break;
            }
            this.hasStarted = true;
            this.idleFrames = 0;
            task();
        }
        return false;
    }

    clear() {
        this.tasks.length = 0;
        this.hasStarted = false;
        this.isReady = false;
        this.idleFrames = 0;
    }
}
