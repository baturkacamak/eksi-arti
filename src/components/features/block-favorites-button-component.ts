// src/components/block-favorites-button-component.ts
import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { ContainerService } from '../../services/features/ui/container-service';
import { BlockOptionsModalFactory } from "../../factories/modal-factories";
import { Container } from "../../di/container";
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IObserverService } from "../../interfaces/services/shared/IObserverService";
import { IBlockFavoritesButtonComponent } from "../../interfaces/components/IBlockFavoritesButtonComponent";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { IBlockOptionsModalFactory } from "../../interfaces/factories";
import { BlockOptionsModal } from './block-options-modal';

/**
 * BlockFavoritesButtonComponent
 * Adds a button to entry controls for quickly blocking users who favorited the entry
 */
export class BlockFavoritesButtonComponent extends BaseFeatureComponent implements IBlockFavoritesButtonComponent {
    private blockButtons: Map<string, HTMLElement> = new Map();
    private static stylesApplied = false;
    
    // Icon configuration constants
    private static readonly BLOCK_ICONS = {
        DEFAULT: 'block'
    } as const;
    
    private static readonly BLOCK_COLORS = {
        DEFAULT: '#ff7063'
    } as const;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: ContainerService,
        private specificContainer: Container,
        private specificBlockModalFactory: IBlockOptionsModalFactory,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
        this.applyStyles();
    }

    protected getStyles(): string | null {
        return `
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
    }

    protected shouldInitialize(): boolean {
        return true;
    }

    protected setupUI(): void {
        this.loggingService.debug('BlockFavoritesButtonComponent UI setup via observer.');
    }

    protected registerObservers(): void {
        this.observerId = this.observerServiceInstance.observe({
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
    }

    protected cleanup(): void {
        this.blockButtons.clear();
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

        this.cssService.addCSS(styles);
        BlockFavoritesButtonComponent.stylesApplied = true;
    }

    /**
     * Add a block button to a specific entry
     */
    private addBlockButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId) return;

            const controlsContainer = this.specificContainerService.getEntryControlsContainer(entry);
            const blockButton = this.createBlockButtonElement(entryId);
            controlsContainer.add(blockButton);
            this.blockButtons.set(entryId, blockButton);
        } catch (error) {
            this.loggingService.error('Error adding block button to entry:', error);
        }
    }

    /**
     * Create a block button element
     */
    private createBlockButtonElement(entryId: string): HTMLElement {
        const buttonContainer = this.domService.createElement('span');
        this.domService.addClass(buttonContainer, 'eksi-block-favorites-button');
        this.domService.addClass(buttonContainer, 'eksi-button');

        const blockIcon = this.iconComponent.create({
            name: BlockFavoritesButtonComponent.BLOCK_ICONS.DEFAULT,
            size: 'small',
            color: BlockFavoritesButtonComponent.BLOCK_COLORS.DEFAULT,
            className: 'eksi-block-favorites-icon'
        });
        this.domService.appendChild(buttonContainer, blockIcon);

        this.domService.addEventListener(buttonContainer, 'click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                // Always show the normal block options modal
                this.loggingService.debug(`Showing block options modal for entry ${entryId}`);
                
                try {
                    const optionsModal = this.specificBlockModalFactory.create(entryId);
                    if (typeof (optionsModal as BlockOptionsModal).display === 'function') {
                        await (optionsModal as BlockOptionsModal).display();
                    } else {
                        await (optionsModal as any).display();
                    }
                } catch (err) {
                    this.loggingService.error('Error showing options modal:', err);
                }
            } catch (error) {
                this.loggingService.error('Error in block button click handler:', error);
            }
        });
        return buttonContainer;
    }
}