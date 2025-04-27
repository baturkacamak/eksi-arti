export interface IAsyncQueueService {
    /**
     * Add a task to the queue.
     * @param task The asynchronous function to run.
     * @param options Optional settings: priority, delay after, retry count.
     */
    add(
        task: () => Promise<void>,
        options?: {
            priority?: number;
            delayAfterMs?: number;
            retries?: number;
        }
    ): void;
}
