// src/components/block-favorites-button-component.ts
import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { IconComponent } from '../shared/icon-component';
import { ContainerService } from "../../services/container-service";
import { ObserverService, observerService as globalObserverService } from "../../services/observer-service";
import { BlockOptionsModalFactory } from "../../factories/modal-factories";
import { ResumeModalFactory } from "../../factories/modal-factories";
import { STORAGE_KEYS } from "../../constants";
import { BlockerState } from "../../types";
import { storageService } from "../../services/storage-service";
import { Container } from "../../di/container";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IObserverService } from "../../interfaces/services/IObserverService";
import { StorageArea } from "../../interfaces/services/IStorageService";
import { IBlockFavoritesButtonComponent } from "../../interfaces/components/IBlockFavoritesButtonComponent";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { IBlockOptionsModalFactory, IResumeModalFactory } from "../../interfaces/factories";
import { ResumeModal } from './resume-modal';
import { BlockOptionsModal } from './block-options-modal';

/**
 * BlockFavoritesButtonComponent
 * Adds a button to entry controls for quickly blocking users who favorited the entry
 */
export class BlockFavoritesButtonComponent extends BaseFeatureComponent implements IBlockFavoritesButtonComponent {
    private blockButtons: Map<string, HTMLElement> = new Map();
    private static stylesApplied = false;

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: ContainerService,
        private specificContainer: Container,
        private specificBlockModalFactory: IBlockOptionsModalFactory,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
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
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-block-favorites-button');
        this.domHandler.addClass(buttonContainer, 'eksi-button');

        const blockIcon = this.iconComponent.create({
            name: 'block',
            size: 'small',
            color: '#ff7063',
            className: 'eksi-block-favorites-icon'
        });
        this.domHandler.appendChild(buttonContainer, blockIcon);

        this.domHandler.addEventListener(buttonContainer, 'click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const result = await storageService.getItem<BlockerState>(
                    STORAGE_KEYS.CURRENT_OPERATION,
                    undefined,
                    StorageArea.LOCAL
                );
                const savedState = result.success && result.data ? result.data : null;

                if (savedState && Date.now() - savedState.timestamp < 3600000) {
                    try {
                        const resumeModalFactory = this.specificContainer.resolve<IResumeModalFactory>('ResumeModalFactory');
                        const resumeModal = resumeModalFactory.create(entryId, savedState);
                        document.body.style.overflow = 'hidden';
                        if (typeof (resumeModal as ResumeModal).display === 'function') {
                            (resumeModal as ResumeModal).display();
                        } else {
                            (resumeModal as any).show();
                        }
                    } catch (err) {
                        this.loggingService.error('Error showing resume modal:', err);
                    }
                } else {
                    try {
                        const optionsModal = this.specificBlockModalFactory.create(entryId);
                        document.body.style.overflow = 'hidden';
                        if (typeof (optionsModal as BlockOptionsModal).display === 'function') {
                            (optionsModal as BlockOptionsModal).display();
                        } else {
                            (optionsModal as any).show();
                        }
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
}