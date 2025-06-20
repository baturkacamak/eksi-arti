import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { IAuthorHighlightButtonComponent } from '../../interfaces/components/features/IAuthorHighlightButtonComponent';
import { IDOMService } from '../../interfaces/services/IDOMService';
import { ICSSService } from '../../interfaces/services/ICSSService';
import { ILoggingService } from '../../interfaces/services/ILoggingService';
import { IObserverService } from '../../interfaces/services/IObserverService';
import { IContainerService } from '../../interfaces/services/IContainerService';
import { IIconComponent } from '../../interfaces/components/IIconComponent';
import { IAuthorHighlighterService } from '../../interfaces/services/IAuthorHighlighterService';
import { ITooltipComponent } from '../../interfaces/components/ITooltipComponent';
import { ICommandFactory } from '../../commands/interfaces/ICommandFactory';
import { ICommandInvoker } from '../../commands/interfaces/ICommandInvoker';
import { IColorService } from '../../interfaces/services/IColorService';

/**
 * Component for adding author highlight buttons to entries
 */
export class AuthorHighlightButtonComponent extends BaseFeatureComponent implements IAuthorHighlightButtonComponent {
    private highlightButtons: Map<string, HTMLElement> = new Map();
    
    // Icon configuration constants
    private static readonly HIGHLIGHT_ICONS = {
        ACTIVE: 'visibility',
        INACTIVE: 'visibility_off',
        PROCESSING: 'hourglass_empty',
        SUCCESS_ADD: 'check_circle',
        SUCCESS_REMOVE: 'remove_circle',
        ERROR: 'error'
    } as const;
    
    private static readonly HIGHLIGHT_COLORS = {
        ACTIVE: '#ffc107',
        INACTIVE: '#9e9e9e',
        PROCESSING: '#ffc107',
        SUCCESS_ADD: '#43a047',
        SUCCESS_REMOVE: '#f44336',
        ERROR: '#f44336'
    } as const;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: IContainerService,
        private authorHighlighterService: IAuthorHighlighterService,
        private tooltipComponent: ITooltipComponent,
        private commandFactory: ICommandFactory,
        private commandInvoker: ICommandInvoker,
        private colorService: IColorService,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
    }

    protected getStyles(): string | null {
        return `
            .eksi-highlight-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                margin: 0;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
                overflow: initial;
                border: 1px solid rgba(255, 193, 7, 0.2);
            }
            
            .eksi-highlight-button:hover {
                background-color: rgba(255, 193, 7, 0.15);
            }
            
            .eksi-highlight-button:active {
                background-color: rgba(255, 193, 7, 0.25);
            }
            
            .eksi-highlight-button:hover::after {
                opacity: 1;
                visibility: visible;
            }
            
            /* Specific styles for the highlight icon */
            .eksi-highlight-icon {
                transition: transform 0.3s ease, color 0.3s ease;
            }
            
            /* Animation for successful highlight action */
            @keyframes eksiHighlightSuccess {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .eksi-highlight-success .eksi-highlight-icon {
                animation: eksiHighlightSuccess 0.5s ease;
            }
            
            /* Processing indicator */
            .eksi-highlight-processing {
                animation: eksiProcessing 1.5s infinite ease-in-out;
            }
            
            @keyframes eksiProcessing {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-highlight-button {
                    border-color: rgba(255, 193, 7, 0.3);
                }
                
                .eksi-highlight-button:hover {
                    background-color: rgba(255, 193, 7, 0.2);
                }
                
                .eksi-highlight-button:active {
                    background-color: rgba(255, 193, 7, 0.3);
                }
            }
        `;
    }

    protected shouldInitialize(): boolean {
        return true;
    }

    protected setupUI(): void {
        this.loggingService.debug('AuthorHighlightButtonComponent UI setup via observer.');
    }

    protected registerObservers(): void {
        this.observerId = this.observerServiceInstance.observe({
            selector: 'li[data-id][data-author]',
            handler: (entries) => {
                entries.forEach(entry => {
                    if (!this.highlightButtons.has(entry.getAttribute('data-id') || '')) {
                        this.addHighlightButtonToEntry(entry as HTMLElement);
                    }
                });
            },
            processExisting: true
        });
    }

    /**
     * Get the appropriate icon name based on highlight state
     */
    private getIconName(isHighlighted: boolean): string {
        return isHighlighted 
            ? AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.ACTIVE 
            : AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.INACTIVE;
    }

    /**
     * Get the appropriate icon color based on highlight state
     */
    private getIconColor(isHighlighted: boolean): string {
        return isHighlighted 
            ? AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.ACTIVE 
            : AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.INACTIVE;
    }

    /**
     * Get the icon element from a button, with error handling
     */
    private getIconElement(button: HTMLElement): HTMLElement | null {
        try {
            const iconElement = button.querySelector('.eksi-highlight-icon') as HTMLElement;
            if (!iconElement) {
                this.loggingService.warn('Icon element not found in button');
                return null;
            }
            return iconElement;
        } catch (error) {
            this.loggingService.error('Error getting icon element:', error);
            return null;
        }
    }

    /**
     * Update icon appearance (content and color)
     */
    private updateIconAppearance(iconElement: HTMLElement, iconName: string, color: string): void {
        iconElement.textContent = iconName;
        iconElement.style.color = color;
    }

    /**
     * Update button to reflect highlight state
     */
    private setButtonHighlightState(button: HTMLElement, isHighlighted: boolean): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;

        this.updateIconAppearance(iconElement, this.getIconName(isHighlighted), this.getIconColor(isHighlighted));
        
        // Update tooltip
        this.tooltipComponent.updateTooltipContent(button, 
            isHighlighted ? 'İzlemeyi Bırak' : 'Bu Yazarı İzle'
        );
    }

    /**
     * Show temporary state and revert after delay
     */
    private showTemporaryState(
        button: HTMLElement, 
        tempIcon: string, 
        tempColor: string, 
        finalCallback: () => void, 
        delay: number = 2000
    ): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;

        this.domService.removeClass(iconElement, 'eksi-highlight-processing');
        this.updateIconAppearance(iconElement, tempIcon, tempColor);
        
        setTimeout(finalCallback, delay);
    }

    /**
     * Add a highlight button to a specific entry
     */
    private addHighlightButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId || this.highlightButtons.has(entryId)) return;

            const container = this.specificContainerService.getEntryControlsContainer(entry);
            const highlightButton = this.createHighlightButtonElement(entry);
            container.add(highlightButton);
            this.highlightButtons.set(entryId, highlightButton);
        } catch (error) {
            this.loggingService.error('Error adding highlight button to entry:', error);
        }
    }

    /**
     * Create a highlight button element
     */
    private createHighlightButtonElement(entry: HTMLElement): HTMLElement {
        const buttonContainer = this.domService.createElement('span');
        this.domService.addClass(buttonContainer, 'eksi-highlight-button');
        this.domService.addClass(buttonContainer, 'eksi-button');

        const author = entry.getAttribute('data-author') || '';
        const config = this.authorHighlighterService.getConfig();
        const isHighlighted = config.authors[author] && config.authors[author].enabled;

        const highlightIcon = this.iconComponent.create({
            name: this.getIconName(isHighlighted),
            size: 'small',
            color: this.getIconColor(isHighlighted),
            className: 'eksi-highlight-icon'
        });

        this.domService.appendChild(buttonContainer, highlightIcon);

        // Add tooltip
        this.tooltipComponent.setupTooltip(buttonContainer, {
            content: isHighlighted ? 'İzlemeyi Bırak' : 'Bu Yazarı İzle',
            position: 'top'
        });

        this.domService.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleHighlightClick(entry, buttonContainer);
        });

        return buttonContainer;
    }

    private async handleHighlightClick(entry: HTMLElement, button: HTMLElement): Promise<void> {
        try {
            const author = entry.getAttribute('data-author');
            if (!author) return;

            this.showProcessingState(button);

            const config = this.authorHighlighterService.getConfig();
            const isCurrentlyHighlighted = config.authors[author] && config.authors[author].enabled;

            let success = false;
            if (isCurrentlyHighlighted) {
                // Remove highlighting using command
                const removeCommand = this.commandFactory.createRemoveAuthorCommand(author);
                success = await this.commandInvoker.execute(removeCommand);
            } else {
                // Add highlighting using command - first generate a color
                const baseColor = this.colorService.generateRandomColor();
                const color = this.colorService.getPastelColor(baseColor);
                const addCommand = this.commandFactory.createAddAuthorCommand(author, color);
                success = await this.commandInvoker.execute(addCommand);
            }

            if (success) {
                // Pass the final state to showSuccessState, it will handle the transition
                this.showSuccessState(button, isCurrentlyHighlighted ? 'remove' : 'add', !isCurrentlyHighlighted);
            } else {
                this.showErrorState(button, isCurrentlyHighlighted);
            }
        } catch (error) {
            this.loggingService.error('Error handling highlight click:', error);
            // Get current state from config since we couldn't complete the operation
            const author = entry.getAttribute('data-author');
            const config = this.authorHighlighterService.getConfig();
            const isCurrentlyHighlighted = author && config.authors[author] && config.authors[author].enabled;
            this.showErrorState(button, !!isCurrentlyHighlighted);
        }
    }



    private updateButtonState(button: HTMLElement, isHighlighted: boolean): void {
        this.setButtonHighlightState(button, isHighlighted);
    }

    private showProcessingState(button: HTMLElement): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;
        
        this.updateIconAppearance(
            iconElement, 
            AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.PROCESSING, 
            AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.PROCESSING
        );
        this.domService.addClass(iconElement, 'eksi-highlight-processing');
    }

    private showSuccessState(button: HTMLElement, action: 'add' | 'remove', finalIsHighlighted: boolean): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;

        const tempIcon = action === 'add' 
            ? AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.SUCCESS_ADD 
            : AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.SUCCESS_REMOVE;
        const tempColor = action === 'add' 
            ? AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.SUCCESS_ADD 
            : AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.SUCCESS_REMOVE;

        // Remove processing state and show success
        this.domService.removeClass(iconElement, 'eksi-highlight-processing');
        this.updateIconAppearance(iconElement, tempIcon, tempColor);
        this.domService.addClass(iconElement, 'eksi-highlight-success');
        
        // After success animation, transition to final state
        setTimeout(() => {
            this.domService.removeClass(iconElement, 'eksi-highlight-success');
            setTimeout(() => {
                // Set final state with proper tooltip update
                this.setButtonHighlightState(button, finalIsHighlighted);
            }, 200);
        }, 1500);
    }

    private showErrorState(button: HTMLElement, currentlyHighlighted: boolean): void {
        this.showTemporaryState(
            button,
            AuthorHighlightButtonComponent.HIGHLIGHT_ICONS.ERROR,
            AuthorHighlightButtonComponent.HIGHLIGHT_COLORS.ERROR,
            () => {
                // Revert to current state (not changed since operation failed)
                this.setButtonHighlightState(button, currentlyHighlighted);
            }
        );
    }

    public cleanup(): void {
        this.highlightButtons.clear();
    }
} 