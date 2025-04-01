// src/services/event-bus.ts
import { EventCallback, EventData, IEventBus } from "../interfaces/services/IEventBus";
import { ILoggingService } from "../interfaces/services/ILoggingService";

/**
 * Implementation of the EventBus service
 * Handles cross-component communication through a publish-subscribe pattern
 */
export class EventBus implements IEventBus {
    private listeners: Map<string, EventCallback[]> = new Map();

    constructor(private loggingService: ILoggingService) {}

    public subscribe(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        this.listeners.get(event)?.push(callback);
        this.loggingService.debug(`EventBus: Subscribed to event "${event}"`, { subscribersCount: this.listeners.get(event)?.length });

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                    this.loggingService.debug(`EventBus: Unsubscribed from event "${event}"`, { subscribersCount: callbacks.length });
                }
            }
        };
    }

    public publish(event: string, data: EventData = {}): void {
        if (!this.listeners.has(event)) {
            this.loggingService.debug(`EventBus: No subscribers for event "${event}"`);
            return;
        }

        const callbacks = this.listeners.get(event) || [];
        this.loggingService.debug(`EventBus: Publishing event "${event}"`, { subscribersCount: callbacks.length, data });

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                this.loggingService.error(`EventBus: Error in event listener for "${event}"`, error);
            }
        });
    }

    public hasSubscribers(event: string): boolean {
        return this.listeners.has(event) && (this.listeners.get(event)?.length || 0) > 0;
    }
}