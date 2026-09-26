interface RenderQueueOptions {
    batchSize: number;
    idleFrameCount: number;
    onReady: () => void;
}

/** Processes scene work in batches and announces the first completed generation. */
export function createRenderQueue({ batchSize, idleFrameCount, onReady }: RenderQueueOptions) {
    const tasks: Array<() => void> = [];
    let hasStarted = false;
    let isReady = false;
    let idleFrames = 0;

    return {
        enqueue(task: () => void) {
            tasks.push(task);
        },
        processFrame() {
            for (let index = 0; index < batchSize; index++) {
                const task = tasks.shift();
                if (!task) {
                    if (hasStarted && !isReady && ++idleFrames > idleFrameCount) {
                        isReady = true;
                        onReady();
                    }
                    break;
                }
                hasStarted = true;
                idleFrames = 0;
                task();
            }
        },
        clear() {
            tasks.length = 0;
            hasStarted = false;
            isReady = false;
            idleFrames = 0;
        },
    };
}
