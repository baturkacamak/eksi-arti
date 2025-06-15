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

/**
 * Component for adding author highlight buttons to entries
 */
export class AuthorHighlightButtonComponent extends BaseFeatureComponent implements IAuthorHighlightButtonComponent {
    private highlightButtons: Map<string, HTMLElement> = new Map();

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: IContainerService,
        private authorHighlighterService: IAuthorHighlighterService,
        private tooltipComponent: ITooltipComponent,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
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
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-highlight-button');
        this.domHandler.addClass(buttonContainer, 'eksi-button');

        const author = entry.getAttribute('data-author') || '';
        const config = this.authorHighlighterService.getConfig();
        const isHighlighted = config.authors[author] && config.authors[author].enabled;

        const highlightIcon = this.iconComponent.create({
            name: isHighlighted ? 'highlight_off' : 'highlight',
            size: 'small',
            color: isHighlighted ? '#f44336' : '#ffc107',
            className: 'eksi-highlight-icon'
        });

        this.domHandler.appendChild(buttonContainer, highlightIcon);

        // Add tooltip
        this.tooltipComponent.setupTooltip(buttonContainer, {
            content: isHighlighted ? 'Vurgulamayı Kaldır' : 'Bu Yazarı Vurgula',
            position: 'top'
        });

        this.domHandler.addEventListener(buttonContainer, 'click', (e) => {
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
                // Remove highlighting
                success = await this.authorHighlighterService.removeAuthor(author);
            } else {
                // Add highlighting
                success = await this.authorHighlighterService.highlightAuthorFromEntry(entry);
            }

            if (success) {
                this.showSuccessState(button, isCurrentlyHighlighted ? 'remove' : 'add');
                this.updateButtonState(button, !isCurrentlyHighlighted);
            } else {
                this.showErrorState(button);
            }
        } catch (error) {
            this.loggingService.error('Error handling highlight click:', error);
            this.showErrorState(button);
        }
    }

    private updateButtonState(button: HTMLElement, isHighlighted: boolean): void {
        const iconElement = button.querySelector('.eksi-highlight-icon') as HTMLElement;
        if (!iconElement) return;

        iconElement.textContent = isHighlighted ? 'highlight_off' : 'highlight';
        iconElement.style.color = isHighlighted ? '#f44336' : '#ffc107';

        // Update tooltip
        this.tooltipComponent.updateTooltipContent(button, 
            isHighlighted ? 'Vurgulamayı Kaldır' : 'Bu Yazarı Vurgula'
        );
    }

    private showProcessingState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-highlight-icon') as HTMLElement;
            if (!iconElement) return;
            iconElement.textContent = 'hourglass_empty';
            iconElement.style.color = '#ffc107';
            this.domHandler.addClass(iconElement, 'eksi-highlight-processing');
        } catch (error) {
            this.loggingService.error('Error showing processing state:', error);
        }
    }

    private showSuccessState(button: HTMLElement, action: 'add' | 'remove'): void {
        try {
            const iconElement = button.querySelector('.eksi-highlight-icon') as HTMLElement;
            if (!iconElement) return;
            this.domHandler.removeClass(iconElement, 'eksi-highlight-processing');
            iconElement.textContent = action === 'add' ? 'check_circle' : 'remove_circle';
            iconElement.style.color = action === 'add' ? '#43a047' : '#f44336';
            this.domHandler.addClass(iconElement, 'eksi-highlight-success');
            setTimeout(() => {
                this.domHandler.removeClass(iconElement, 'eksi-highlight-success');
                setTimeout(() => {
                    iconElement.textContent = action === 'add' ? 'highlight_off' : 'highlight';
                    iconElement.style.color = action === 'add' ? '#f44336' : '#ffc107';
                }, 200);
            }, 1500);
        } catch (error) {
            this.loggingService.error('Error showing success state:', error);
        }
    }

    private showErrorState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-highlight-icon') as HTMLElement;
            if (!iconElement) return;
            this.domHandler.removeClass(iconElement, 'eksi-highlight-processing');
            iconElement.textContent = 'error';
            iconElement.style.color = '#f44336';
            setTimeout(() => {
                iconElement.textContent = 'highlight';
                iconElement.style.color = '#ffc107';
            }, 2000);
        } catch (error) {
            this.loggingService.error('Error showing error state:', error);
        }
    }

    public cleanup(): void {
        this.highlightButtons.clear();
    }
} 