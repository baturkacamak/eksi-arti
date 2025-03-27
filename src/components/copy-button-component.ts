import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { logError, logDebug } from '../services/logging-service';
import {entryControlsService} from "../services/entry-controls-service";

/**
 * CopyButtonComponent
 * Adds copy buttons to entry controls for easily copying entry text
 */
export class CopyButtonComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private iconComponent: IconComponent;
    private copyButtons: Map<string, HTMLElement> = new Map();
    private inTransition: Set<HTMLElement> = new Set(); // Track buttons currently in transition
    private static stylesApplied = false;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.applyStyles();
    }

    /**
     * Initialize the component by adding copy buttons to existing entries
     */
    public initialize(): void {
        try {
            this.addCopyButtonsToEntries();
            this.observeNewEntries();
            logDebug('Copy button component initialized');
        } catch (error) {
            logError('Error initializing copy button component:', error);
        }
    }

    /**
     * Apply styles for copy buttons
     */
    private applyStyles(): void {
        if (CopyButtonComponent.stylesApplied) return;

        const styles = `
             .eksi-copy-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                margin: 0;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid rgba(129, 193, 75, 0.2); /* Subtle border with brand color */
                user-select: none; /* Prevent text selection */
            }
            
            .eksi-copy-button:hover {
                background-color: rgba(129, 193, 75, 0.15); /* Slightly more visible than original */
            }
            
            .eksi-copy-button:active {
                background-color: rgba(129, 193, 75, 0.25);
            }
            
            .eksi-copy-button.in-transition {
                pointer-events: none; /* Prevent clicks during transition */
                cursor: default;
            }
            
            .eksi-copy-button:hover::after {
                opacity: 1;
                visibility: visible;
            }
            
            /* Specific styles for the copy icon */
            .eksi-copy-icon {
                transition: transform 0.3s ease, color 0.3s ease;
                user-select: none; /* Reinforcing no text selection */
            }
            
            /* Animation for successful copy action */
            @keyframes eksiCopySuccess {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .eksi-copy-success .eksi-copy-icon {
                animation: eksiCopySuccess 0.5s ease;
            }
        `;

        this.cssHandler.addCSS(styles);
        CopyButtonComponent.stylesApplied = true;
    }

    /**
     * Add copy buttons to all entry controls
     */
    private addCopyButtonsToEntries(): void {
        const entries = document.querySelectorAll('li[data-id]');
        entries.forEach(entry => this.addCopyButtonToEntry(entry as HTMLElement));
    }

    /**
     * Add a copy button to a specific entry
     */
    private addCopyButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId || this.copyButtons.has(entryId)) return;

            // Get container from the singleton service
            const container = entryControlsService.getContainer(entry);

            // Create copy button
            const copyButton = this.createCopyButton(entry.querySelector('.content')?.textContent || '');

            // Add to container
            container.add(copyButton);

            // Store reference
            this.copyButtons.set(entryId, copyButton);
        } catch (error) {
            logError('Error adding copy button to entry:', error);
        }
    }

        /**
     * Create a copy button element
     */
    private createCopyButton(textToCopy: string): HTMLElement {
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-copy-button');

        // Add title for accessibility and user feedback
        buttonContainer.setAttribute('title', 'İçeriği kopyala');
        buttonContainer.setAttribute('aria-label', 'İçeriği kopyala');

        // Create copy icon using IconComponent with a specific class for easier selection
        const copyIcon = this.iconComponent.create({
            name: 'content_copy',
            size: 'small',
            color: '#81c14b',
            className: 'eksi-copy-icon' // Add specific class for easier targeting in transitions
        });

        // Append the icon to the button container
        this.domHandler.appendChild(buttonContainer, copyIcon);

        // Add click listener to copy the entry content
        this.domHandler.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Only process click if not already in transition
            if (!this.inTransition.has(buttonContainer)) {
                this.copyTextToClipboard(textToCopy, buttonContainer);
            }
        });

        return buttonContainer;
    }

    /**
     * Copy text to clipboard and show feedback
     */
    private copyTextToClipboard(text: string, button: HTMLElement): void {
        try {
            // Mark button as in transition state
            this.inTransition.add(button);
            this.domHandler.addClass(button, 'in-transition');

            // Create a temporary textarea element
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();

            // Execute the copy command
            const success = document.execCommand('copy');

            if (success) {
                // Add success animation
                this.domHandler.addClass(button, 'eksi-copy-success');

                // Find the icon element inside the button
                const iconElement = button.querySelector('.eksi-icon') as HTMLElement;
                if (iconElement) {
                    // Use our enhanced IconComponent to show success state with animation
                    this.iconComponent.showSuccessState(iconElement, 1500);
                }

                // Change title temporarily to provide feedback
                const originalTitle = button.getAttribute('title') || 'İçeriği kopyala';
                button.setAttribute('title', 'Kopyalandı!');

                // Reset button state after animation completes
                setTimeout(() => {
                    this.resetButtonState(button, originalTitle);
                }, 1500);
            } else {
                // If execCommand fails, try clipboard API
                this.tryClipboardAPI(text, button);
            }

            // Clean up
            document.body.removeChild(textarea);
        } catch (error) {
            logError('Error copying to clipboard:', error);
            // Try alternative method for modern browsers
            this.tryClipboardAPI(text, button);
        }
    }

    /**
     * Try using the Clipboard API as fallback
     */
    private tryClipboardAPI(text: string, button: HTMLElement): void {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    // Show success using the IconComponent's transition feature
                    const iconElement = button.querySelector('.eksi-icon') as HTMLElement;
                    if (iconElement) {
                        this.iconComponent.showSuccessState(iconElement, 1500);
                    }

                    // Change title temporarily to provide feedback
                    const originalTitle = button.getAttribute('title') || 'İçeriği kopyala';
                    button.setAttribute('title', 'Kopyalandı!');

                    // Reset button state after animation completes
                    setTimeout(() => {
                        this.resetButtonState(button, originalTitle);
                    }, 1500);
                })
                .catch(err => {
                    // Show error using the IconComponent's transition feature
                    const iconElement = button.querySelector('.eksi-icon') as HTMLElement;
                    if (iconElement) {
                        this.iconComponent.showErrorState(iconElement, 1500);
                    }

                    // Change title temporarily to provide error feedback
                    button.setAttribute('title', 'Kopyalama başarısız!');

                    // Reset button state after animation completes
                    setTimeout(() => {
                        this.resetButtonState(button, 'İçeriği kopyala');
                    }, 1500);

                    logError('Clipboard API error:', err);
                });
        } else {
            // No clipboard method available, reset button after a delay
            setTimeout(() => {
                this.resetButtonState(button, 'İçeriği kopyala');
            }, 1500);
        }
    }

    /**
     * Reset button to original state after transition completes
     */
    private resetButtonState(button: HTMLElement, originalTitle: string): void {
        // Remove transition classes
        this.domHandler.removeClass(button, 'in-transition');
        this.domHandler.removeClass(button, 'eksi-copy-success');

        // Reset title
        button.setAttribute('title', originalTitle);

        // Remove from transition tracking
        this.inTransition.delete(button);
    }

    /**
     * Observe DOM for new entries to add copy buttons
     */
    private observeNewEntries(): void {
        try {
            const observer = new MutationObserver((mutations) => {
                let shouldCheckForNewEntries = false;

                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length) {
                        for (const node of mutation.addedNodes) {
                            if (node instanceof HTMLElement) {
                                // Check if the added node is an entry or contains entries
                                if (node.matches('li[data-id]') || node.querySelector('li[data-id]')) {
                                    shouldCheckForNewEntries = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (shouldCheckForNewEntries) break;
                }

                if (shouldCheckForNewEntries) {
                    // Small delay to ensure the DOM is fully updated
                    setTimeout(() => this.addCopyButtonsToEntries(), 100);
                }
            });

            // Start observing the document body for DOM changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            logError('Error setting up mutation observer:', error);
        }
    }
}