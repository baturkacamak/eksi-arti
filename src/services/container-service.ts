
// src/services/container-service.ts
import { ComponentContainer } from '../components/shared/component-container';
import { LoggingService} from './logging-service';
import {ContainerShape, ContainerSize, ContainerTheme} from "./container-theme-service";
import {DOMService} from "./dom-service";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IComponentContainerConfig} from "../interfaces/IContainer";

export class ContainerService {

    // Maps to store different types of containers
    private entryControlsContainers: Map<string, ComponentContainer> = new Map();
    private sortButtonsContainer: ComponentContainer | null = null;
    private searchControlsContainer: ComponentContainer | null = null;
    private notificationContainers: Map<string, ComponentContainer> = new Map();

    constructor(
        private domHandler: IDOMService,
        private loggingService: ILoggingService
    ) {}

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

            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                gap: 4,
                position: 'inline',
                className: 'eksi-entry-controls',
                // Use the theme system
                theme: ContainerTheme.NEUTRAL,
                size: ContainerSize.MEDIUM,
                shape: ContainerShape.SLIGHTLY_ROUNDED,
                isHoverable: true,
                hasBorder: true
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

    /**
     * Get or create the custom controls row container
     * This provides a central container for sort buttons and search input
     */
    public getCustomControlsRow(): ComponentContainer {
        try {
            // Check if we already have a container in the DOM
            const existingElement = document.querySelector('.eksi-custom-controls-row');

            // If it exists, find a target element to attach to
            if (existingElement) {
                const config: IComponentContainerConfig = {
                    direction: 'horizontal',
                    position: 'inline',
                    className: 'eksi-custom-controls-row',
                    theme: ContainerTheme.NEUTRAL,
                    size: ContainerSize.MEDIUM,
                    shape: ContainerShape.ROUNDED,
                    isHoverable: false,
                    hasBorder: true,
                    customStyles: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        margin: '10px 0',
                        width: '100%'
                    }
                };

                // Create a new container with the existing element
                const container = new ComponentContainer(config);
                const containerElement = container.getElement();

                // Replace the existing element with our container
                if (containerElement && existingElement.parentNode) {
                    existingElement.parentNode.replaceChild(containerElement, existingElement);
                    // Copy any children from the original element
                    while (existingElement.firstChild) {
                        containerElement.appendChild(existingElement.firstChild);
                    }
                }

                return container;
            }

            // If no existing element, create a new container
            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                position: 'inline',
                className: 'eksi-custom-controls-row',
                theme: ContainerTheme.NEUTRAL,
                size: ContainerSize.MEDIUM,
                shape: ContainerShape.ROUNDED,
                isHoverable: false,
                hasBorder: true,
                customStyles: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    margin: '10px 0',
                    width: '100%'
                }
            };

            // Find the target element to attach to
            const targetElement = document.querySelector('#topic') || document.body;
            const firstContent = targetElement.querySelector('#entry-item-list');

            // Create the container
            const container = new ComponentContainer(config);

            // Attach it to the DOM
            const containerElement = container.getElement();
            if (containerElement) {
                if (firstContent) {
                    targetElement.insertBefore(containerElement, firstContent);
                } else {
                    targetElement.appendChild(containerElement);
                }
            }

            // Add left and right sections for sort buttons and search
            const leftSection = this.domHandler.createElement('div');
            this.domHandler.addClass(leftSection, 'eksi-custom-controls-left');
            leftSection.style.display = 'flex';
            leftSection.style.alignItems = 'center';
            leftSection.style.flexGrow = '1';

            const rightSection = this.domHandler.createElement('div');
            this.domHandler.addClass(rightSection, 'eksi-custom-controls-right');
            rightSection.style.display = 'flex';
            rightSection.style.alignItems = 'center';
            rightSection.id = 'eksi-search-container';

            // Add sections to container
            if (containerElement) {
                containerElement.appendChild(leftSection);
                containerElement.appendChild(rightSection);
            }

            return container;
        } catch (error) {
            this.loggingService.error('Error getting custom controls row container:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    /**
     * Get the sort buttons container within the custom controls row
     */
    public getSortButtonsContainerInCustomRow(): ComponentContainer {
        try {
            // Get or create the custom controls row
            const controlsRow = this.getCustomControlsRow();
            const controlsElement = controlsRow.getElement();

            if (!controlsElement) {
                throw new Error('Custom controls row element not found');
            }

            // Find the left section
            const leftSection = controlsElement.querySelector('.eksi-custom-controls-left');
            if (!leftSection) {
                throw new Error('Left section of custom controls row not found');
            }

            // Check if we already have a sort buttons container
            if (this.sortButtonsContainer) {
                return this.sortButtonsContainer;
            }

            // Create the sort buttons container
            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                gap: 8,
                position: 'inline',
                className: 'eksi-sort-buttons',
                theme: ContainerTheme.DEFAULT,
                hasBorder: false,
                customStyles: {
                    display: 'flex',
                    alignItems: 'center'
                }
            };

            this.sortButtonsContainer = this.createAndAttachContainer(config, () => leftSection as HTMLElement);
            return this.sortButtonsContainer;
        } catch (error) {
            this.loggingService.error('Error getting sort buttons container in custom row:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    // Get sort buttons container
    public getSortButtonsContainer(parentElement: HTMLElement): ComponentContainer {
        try {
            if (this.sortButtonsContainer) {
                return this.sortButtonsContainer;
            }

            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                gap: 3,
                position: 'inline',
                className: 'eksi-sort-buttons',
                // Use the theme system
                theme: ContainerTheme.DEFAULT,
                size: ContainerSize.SMALL,
                shape: ContainerShape.SLIGHTLY_ROUNDED,
                isHoverable: false,
                hasBorder: false,
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

            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                gap: 5,
                className: 'eksi-search-controls',
                // Use the theme system
                theme: ContainerTheme.PRIMARY,
                size: ContainerSize.MEDIUM,
                shape: ContainerShape.ROUNDED,
                isHoverable: true,
                hasShadow: true
            };

            this.searchControlsContainer = this.createAndAttachContainer(config, () => parentElement);
            return this.searchControlsContainer;
        } catch (error) {
            this.loggingService.error('Error getting search controls container:', error);
            return this.createTemporaryContainer('horizontal');
        }
    }

    private createTemporaryContainer(direction: 'horizontal' | 'vertical'): ComponentContainer {
        return new ComponentContainer({
            direction,
            gap: 5,
            position: 'inline',
            theme: ContainerTheme.NEUTRAL,
            size: ContainerSize.MEDIUM,
            hasBorder: false
        });
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

    private createAndAttachContainer(
        config: IComponentContainerConfig,
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

    /**
     * Get the search container within the custom controls row
     */
    public getSearchContainerInCustomRow(): ComponentContainer {
        try {
            // Get or create the custom controls row
            const controlsRow = this.getCustomControlsRow();
            const controlsElement = controlsRow.getElement();

            if (!controlsElement) {
                throw new Error('Custom controls row element not found');
            }

            // Find the right section
            const rightSection = controlsElement.querySelector('.eksi-custom-controls-right');
            if (!rightSection) {
                throw new Error('Right section of custom controls row not found');
            }

            // Check if we already have a search container
            if (this.searchControlsContainer) {
                return this.searchControlsContainer;
            }

            // Create the search container
            const config: IComponentContainerConfig = {
                direction: 'horizontal',
                gap: 8,
                position: 'inline',
                className: 'eksi-search-controls',
                theme: ContainerTheme.DEFAULT,
                hasBorder: false,
                customStyles: {
                    display: 'flex',
                    alignItems: 'center'
                }
            };

            this.searchControlsContainer = this.createAndAttachContainer(config, () => rightSection as HTMLElement);
            return this.searchControlsContainer;
        } catch (error) {
            this.loggingService.error('Error getting search container in custom row:', error);
            return this.createTemporaryContainer('horizontal');
        }
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