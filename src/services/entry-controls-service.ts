// Create a new service: src/services/entry-controls-service.ts
import { ComponentContainer } from '../components/component-container';
import { logError } from './logging-service';

export class EntryControlsService {
    private static instance: EntryControlsService;
    private entryControlsContainers: Map<string, ComponentContainer> = new Map();

    private constructor() {
        // Private constructor for singleton pattern
    }

    public static getInstance(): EntryControlsService {
        if (!EntryControlsService.instance) {
            EntryControlsService.instance = new EntryControlsService();
        }
        return EntryControlsService.instance;
    }

    public getContainer(entry: HTMLElement): ComponentContainer {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId) {
                // Create a temporary container if no entry ID
                return new ComponentContainer({
                    direction: 'horizontal',
                    gap: 8,
                    position: 'inline'
                });
            }

            // Return existing container if we have one
            if (this.entryControlsContainers.has(entryId)) {
                return this.entryControlsContainers.get(entryId)!;
            }

            // Create new container
            const container = this.setupEntryControls(entry);
            this.entryControlsContainers.set(entryId, container);
            return container;
        } catch (error) {
            logError('Error getting entry controls container:', error);
            // Return a new container as fallback
            return new ComponentContainer({
                direction: 'horizontal',
                gap: 8,
                position: 'inline'
            });
        }
    }

    private setupEntryControls(entry: HTMLElement): ComponentContainer {
        const container = new ComponentContainer({
            direction: 'horizontal',
            gap: 8,
            position: 'inline',
            className: 'eksi-entry-controls'
        });

        // Store reference to the container element
        const containerElement = container.getElement();
        if (containerElement && entry) {
            const controlsContainer = entry.querySelector('.feedback-container');
            if (controlsContainer) {
                containerElement.style.display = 'inline-flex';
                containerElement.style.alignItems = 'center';
                containerElement.style.marginLeft = '10px';
                controlsContainer.appendChild(containerElement);
            }
        }

        return container;
    }
}

// Export the singleton instance
export const entryControlsService = EntryControlsService.getInstance();