
// src/services/container-service.ts
import { ComponentContainer, ComponentContainerConfig } from '../components/component-container';
import { LoggingService} from './logging-service';

export class ContainerService {
    private static instance: ContainerService;

    // Maps to store different types of containers
    private entryControlsContainers: Map<string, ComponentContainer> = new Map();
    private sortButtonsContainer: ComponentContainer | null = null;
    private searchControlsContainer: ComponentContainer | null = null;
    private notificationContainers: Map<string, ComponentContainer> = new Map();
    private loggingService: LoggingService;

    private constructor() {
        this.loggingService = new LoggingService();
        // Private constructor for singleton
    }

    public static getInstance(): ContainerService {
        if (!ContainerService.instance) {
            ContainerService.instance = new ContainerService();
        }
        return ContainerService.instance;
    }

    // Get entry controls container for a specific entry
    public getEntryControlsContainer(entry: HTMLElement): ComponentContainer {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId) {
                return this.createTemporaryContainer('horizontal');
            }

            if (this.entryControlsContainers.has(entryId)) {
                return this.entryControlsContainers.get(entryId)!;
            }

            const config: ComponentContainerConfig = {
                direction: 'horizontal',
                gap: 8,
                position: 'inline',
                className: 'eksi-entry-controls'
            };

            const container = this.createAndAttachContainer(config, () => {
                const controlsContainer = entry.querySelector('.feedback-container');
                return controlsContainer as HTMLElement;
            });

            this.entryControlsContainers.set(entryId, container);
            return container;
        } catch (error) {
          this.loggingService.error('Error getting entry controls container:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    // Get sort buttons container
    public getSortButtonsContainer(parentElement: HTMLElement): ComponentContainer {
        try {
            if (this.sortButtonsContainer) {
                return this.sortButtonsContainer;
            }

            const config: ComponentContainerConfig = {
                direction: 'horizontal',
                gap: 3,
                position: 'inline',
                className: 'eksi-sort-buttons',
                customStyles: {
                    marginLeft: '15px',
                    display: 'inline-flex',
                    alignItems: 'center'
                }
            };

            this.sortButtonsContainer = this.createAndAttachContainer(config, () => parentElement);
            return this.sortButtonsContainer;
        } catch (error) {
          this.loggingService.error('Error getting sort buttons container:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    // Get search controls container
    public getSearchControlsContainer(parentElement: HTMLElement): ComponentContainer {
        try {
            if (this.searchControlsContainer) {
                return this.searchControlsContainer;
            }

            const config: ComponentContainerConfig = {
                direction: 'horizontal',
                gap: 5,
                className: 'eksi-search-controls'
            };

            this.searchControlsContainer = this.createAndAttachContainer(config, () => parentElement);
            return this.searchControlsContainer;
        } catch (error) {
          this.loggingService.error('Error getting search controls container:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    // Reset specific container types
    public resetSortButtonsContainer(): void {
        this.removeContainer(this.sortButtonsContainer);
        this.sortButtonsContainer = null;
    }

    public resetSearchControlsContainer(): void {
        this.removeContainer(this.searchControlsContainer);
        this.searchControlsContainer = null;
    }

    public removeEntryControlsContainer(entryId: string): void {
        if (this.entryControlsContainers.has(entryId)) {
            this.removeContainer(this.entryControlsContainers.get(entryId)!);
            this.entryControlsContainers.delete(entryId);
        }
    }

    // Helper methods
    private createTemporaryContainer(direction: 'horizontal' | 'vertical'): ComponentContainer {
        return new ComponentContainer({
            direction,
            gap: 5,
            position: 'inline'
        });
    }

    private createAndAttachContainer(
        config: ComponentContainerConfig,
        getParent: () => HTMLElement | null
    ): ComponentContainer {
        const container = new ComponentContainer(config);
        const containerElement = container.getElement();

        if (containerElement) {
            const parent = getParent();
            if (parent) {
                // Apply inline styles specifically for this container if needed
                if (config.position === 'inline') {
                    containerElement.style.display = 'inline-flex';
                    containerElement.style.alignItems = 'center';
                }

                parent.appendChild(containerElement);
               this.loggingService.debug(`Container ${config.className || 'unnamed'} added to page`);
            }
        }

        return container;
    }

    private removeContainer(container: ComponentContainer | null): void {
        if (container) {
            const element = container.getElement();
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    }
}

// Export the singleton instance
export const containerService = ContainerService.getInstance();