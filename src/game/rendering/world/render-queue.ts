interface RenderQueueOptions {
    batchSize: number;
    idleFrameCount: number;
    onReady: () => void;
}

/** Processes scene work in batches and announces the first completed generation. */
export class RenderQueue {
    private readonly batchSize;
    private readonly idleFrameCount;
    private readonly onReady;
    private readonly tasks: Array<() => void> = [];
    private hasStarted = false;
    private isReady = false;
    private idleFrames = 0;

    constructor({ batchSize, idleFrameCount, onReady }: RenderQueueOptions) {
        this.batchSize = batchSize;
        this.idleFrameCount = idleFrameCount;
        this.onReady = onReady;
    }

    enqueue(task: () => void) {
        this.tasks.push(task);
    }

    processFrame() {
        for (let index = 0; index < this.batchSize; index++) {
            const task = this.tasks.shift();
            if (!task) {
                if (this.hasStarted && !this.isReady && ++this.idleFrames > this.idleFrameCount) {
                    this.isReady = true;
                    this.onReady();
                }
                break;
            }
            this.hasStarted = true;
            this.idleFrames = 0;
            task();
        }
    }

    clear() {
        this.tasks.length = 0;
        this.hasStarted = false;
        this.isReady = false;
        this.idleFrames = 0;
    }
}
