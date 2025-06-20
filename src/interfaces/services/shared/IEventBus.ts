// src/interfaces/services/IEventBus.ts
export interface EventData {
    [key: string]: any;
}

export type EventCallback = (data: EventData) => void;

export interface IEventBus {
    /**
     * Subscribe to an event
     * @param event Event name to subscribe to
     * @param callback Function to call when event is published
     * @returns Unsubscribe function
     */
    subscribe(event: string, callback: EventCallback): () => void;

    /**
     * Publish an event
     * @param event Event name to publish
     * @param data Data to pass to subscribers
     */
    publish(event: string, data?: EventData): void;

    /**
     * Check if an event has subscribers
     * @param event Event name to check
     * @returns True if event has subscribers
     */
    hasSubscribers(event: string): boolean;
}