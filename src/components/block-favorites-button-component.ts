// src/components/block-favorites-button-component.ts
import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { LoggingService } from '../services/logging-service';
import { ContainerService, containerService } from "../services/container-service";
import { ObserverService, observerService } from "../services/observer-service";
import { BlockOptionsModalFactory } from "../factories/modal-factories";
import { ResumeModalFactory } from "../factories/modal-factories";
import { STORAGE_KEYS } from "../constants";
import { BlockerState } from "../types";
import { storageService } from "../services/storage-service";
import { Container } from "../di/container";
import {ICSSService} from "../interfaces/services/ICSSService";
import {IDOMService} from "../interfaces/services/IDOMService";
import {ILoggingService} from "../interfaces/services/ILoggingService";
import {IObserverService} from "../interfaces/services/IObserverService";
import {StorageArea} from "../interfaces/services/IStorageService";
import {IBlockFavoritesButtonComponent} from "../interfaces/components/IBlockFavoritesButtonComponent";

/**
 * BlockFavoritesButtonComponent
 * Adds a button to entry controls for quickly blocking users who favorited the entry
 */
export class BlockFavoritesButtonComponent implements IBlockFavoritesButtonComponent {
    private blockButtons: Map<string, HTMLElement> = new Map();
    private static stylesApplied = false;
    private observerId: string = '';

    constructor(
        private domHandler: IDOMService,
        private cssHandler: ICSSService,
        private loggingService: ILoggingService,
        private iconComponent: IconComponent,
        private containerService: ContainerService = containerService,
        private observerService: IObserverService = observerService,
        private container: Container
    ) {
        this.applyStyles();
    }

    /**
     * Initialize the component by adding block buttons to existing entries
     */
    public initialize(): void {
        try {
            this.observerId = observerService.observe({
                selector: 'li[data-id]',
                handler: (entries) => {
                    entries.forEach(entry => {
                        if (!this.blockButtons.has(entry.getAttribute('data-id') || '')) {
                            this.addBlockButtonToEntry(entry as HTMLElement);
                        }
                    });
                },
                processExisting: true
            });

            this.applyStyles();
            this.loggingService.debug('Block favorites button component initialized');
        } catch (error) {
            this.loggingService.error('Error initializing block favorites button component:', error);
        }
    }

    /**
     * Apply styles for block buttons
     */
    private applyStyles(): void {
        if (BlockFavoritesButtonComponent.stylesApplied) return;

        const styles = `
            .eksi-block-favorites-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                margin: 0;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid rgba(255, 112, 99, 0.2);
                user-select: none;
            }
            
            .eksi-block-favorites-button:hover {
                background-color: rgba(255, 112, 99, 0.15);
            }
            
            .eksi-block-favorites-button:active {
                background-color: rgba(255, 112, 99, 0.25);
            }
            
            .eksi-block-favorites-icon {
                transition: transform 0.3s ease, color 0.3s ease;
                user-select: none;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-block-favorites-button:hover {
                    background-color: rgba(255, 112, 99, 0.2);
                }
            }
        `;

        this.cssHandler.addCSS(styles);
        BlockFavoritesButtonComponent.stylesApplied = true;
    }

    /**
     * Add a block button to a specific entry
     */
    private addBlockButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId) return;

            // Get container from the singleton service
            const container = this.containerService.getEntryControlsContainer(entry);

            // Create block button
            const blockButton = this.createBlockButton(entryId);

            // Add to container
            container.add(blockButton);

            // Store reference
            this.blockButtons.set(entryId, blockButton);
        } catch (error) {
            this.loggingService.error('Error adding block button to entry:', error);
        }
    }

    /**
     * Create a block button element
     */
    private createBlockButton(entryId: string): HTMLElement {
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-block-favorites-button');
        this.domHandler.addClass(buttonContainer, 'eksi-button'); // Add this class for theme compatibility

        // Create block icon
        const blockIcon = this.iconComponent.create({
            name: 'block',  // or another appropriate icon like 'person_off', 'person_remove'
            size: 'small',
            color: '#ff7063',
            className: 'eksi-block-favorites-icon'
        });

        // Append elements to container
        this.domHandler.appendChild(buttonContainer, blockIcon);

        // Add click listener for blocking
        this.domHandler.addEventListener(buttonContainer, 'click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                // Check if there's an existing operation
                const result = await storageService.getItem<BlockerState>(
                    STORAGE_KEYS.CURRENT_OPERATION,
                    undefined,
                    StorageArea.LOCAL
                );

                const savedState = result.success && result.data ? result.data : null;

                if (savedState && Date.now() - savedState.timestamp < 3600000) { // Less than 1 hour old
                    try {
                        const resumeModalFactory = this.container.resolve<ResumeModalFactory>('ResumeModalFactory');
                        const resumeModal = resumeModalFactory.create(entryId, savedState);
                        document.body.style.overflow = 'hidden';
                        resumeModal.show();
                    } catch (err) {
                        this.loggingService.error('Error showing resume modal:', err);
                    }
                } else {
                    try {
                        const blockModalFactory = this.container.resolve<BlockOptionsModalFactory>('BlockOptionsModalFactory');
                        const optionsModal = blockModalFactory.create(entryId);
                        document.body.style.overflow = 'hidden';
                        optionsModal.show();
                    } catch (err) {
                        this.loggingService.error('Error showing options modal:', err);
                    }
                }
            } catch (error) {
                this.loggingService.error('Error in block button click handler:', error);
            }
        });

        return buttonContainer;
    }

    /**
     * Cleanup resources when component is destroyed
     */
    public destroy(): void {
        // Unregister from observer service
        if (this.observerId) {
            this.observerService.unobserve(this.observerId);
        }

        // Clear references
        this.blockButtons.clear();
    }
}