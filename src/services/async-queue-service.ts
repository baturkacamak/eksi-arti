type QueueTask = {
    task: () => Promise<void>;
    retriesLeft: number;
    delayAfterMs: number;
    priority: number;
};

export class AsyncQueueService {
    private queue: QueueTask[] = [];
    private activeTasks = 0;
    private isProcessing = false;

    constructor(
        private defaultDelayMs = 0,
        private maxConcurrency = 1,
        private maxRetries = 0
    ) {}

    add(
        task: () => Promise<void>,
        options?: {
            priority?: number;
            delayAfterMs?: number;
            retries?: number;
        }
    ): void {
        this.queue.push({
            task,
            retriesLeft: options?.retries ?? this.maxRetries,
            delayAfterMs: options?.delayAfterMs ?? this.defaultDelayMs,
            priority: options?.priority ?? 0,
        });

        this.sortQueueByPriority();

        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    private sortQueueByPriority(): void {
        this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first
    }

    private async processQueue(): Promise<void> {
        this.isProcessing = true;

        while (this.queue.length > 0) {
            if (this.activeTasks >= this.maxConcurrency) {
                await new Promise(resolve => setTimeout(resolve, 50));
                continue;
            }

            const nextTask = this.queue.shift();
            if (!nextTask) continue;

            this.activeTasks++;

            this.executeTask(nextTask)
                .then(() => {
                    this.activeTasks--;
                })
                .catch(() => {
                    this.activeTasks--;
                });
        }

        this.isProcessing = false;
    }

    private async executeTask(queueTask: QueueTask): Promise<void> {
        try {
            await queueTask.task();

            if (queueTask.delayAfterMs > 0) {
                await new Promise(resolve => setTimeout(resolve, queueTask.delayAfterMs));
            }
        } catch (error) {
            console.error('AsyncQueueService: task failed.', error);

            if (queueTask.retriesLeft > 0) {
                console.warn(`Retrying... (${queueTask.retriesLeft} retries left)`);
                queueTask.retriesLeft--;
                this.queue.push(queueTask); // Re-add at the end
                this.sortQueueByPriority();
            }
        }
    }
}
