import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { logError, logDebug } from '../services/logging-service';
import html2canvas from 'html2canvas';

/**
 * ScreenshotButtonComponent
 * Adds screenshot buttons to entry controls for capturing entry images
 */
export class ScreenshotButtonComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private iconComponent: IconComponent;
    private screenshotButtons: Map<string, HTMLElement> = new Map();
    private static stylesApplied = false;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.applyStyles();
    }

    /**
     * Initialize the component by adding screenshot buttons to existing entries
     */
    public initialize(): void {
        try {
            this.loadHtml2Canvas().then(() => {
                this.addScreenshotButtonsToEntries();
                this.observeNewEntries();
                logDebug('Screenshot button component initialized');
            });
        } catch (error) {
            logError('Error initializing screenshot button component:', error);
        }
    }

    /**
     * Dynamically load html2canvas library
     */
    private async loadHtml2Canvas(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                // Check if html2canvas is already loaded
                if (typeof (window as any).html2canvas !== 'undefined') {
                    resolve();
                    return;
                }

                // Use the extension's local copy of html2canvas
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('lib/html2canvas.min.js');
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load html2canvas'));
                document.head.appendChild(script);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Apply styles for screenshot buttons
     */
    private applyStyles(): void {
        if (ScreenshotButtonComponent.stylesApplied) return;

        const styles = `
            .eksi-screenshot-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                margin: 0 0 0 15px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
                position: relative;
                border: 1px solid rgba(142, 158, 217, 0.2); /* Different color from copy button */
            }
            
            .eksi-screenshot-button:hover {
                background-color: rgba(142, 158, 217, 0.15);
            }
            
            .eksi-screenshot-button:active {
                background-color: rgba(142, 158, 217, 0.25);
            }
            
            .eksi-screenshot-button::after {
                content: "Ekran Görüntüsü (Ekşi+)";
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s, visibility 0.2s;
                pointer-events: none;
                white-space: nowrap;
                margin-bottom: 5px;
            }
            
            .eksi-screenshot-button:hover::after {
                opacity: 1;
                visibility: visible;
            }
            
            /* Specific styles for the screenshot icon */
            .eksi-screenshot-icon {
                transition: transform 0.3s ease, color 0.3s ease;
            }
            
            /* Animation for successful screenshot action */
            @keyframes eksiScreenshotSuccess {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            .eksi-screenshot-success .eksi-screenshot-icon {
                animation: eksiScreenshotSuccess 0.5s ease;
            }
            
            /* Processing indicator */
            .eksi-screenshot-processing {
                animation: eksiProcessing 1.5s infinite ease-in-out;
            }
            
            @keyframes eksiProcessing {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        this.cssHandler.addCSS(styles);
        ScreenshotButtonComponent.stylesApplied = true;
    }

    /**
     * Add screenshot buttons to all entry controls
     */
    private addScreenshotButtonsToEntries(): void {
        const entries = document.querySelectorAll('li[data-id]');
        entries.forEach(entry => this.addScreenshotButtonToEntry(entry as HTMLElement));
    }

    /**
     * Add a screenshot button to a specific entry
     */
    private addScreenshotButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId || this.screenshotButtons.has(entryId)) return;

            const controlsContainer = entry.querySelector('.feedback-container');
            if (!controlsContainer) return;

            // Create screenshot button
            const screenshotButton = this.createScreenshotButton(entry);

            // Position the button in the control area
            // Find the first control element to position relative to
            // Position the button in the control area
            // Find the first control element to insert after
            const firstControl = controlsContainer.querySelector('.feedback-container');
            if (firstControl && firstControl.parentNode) {
                // Insert after the first control element
                const parent = firstControl.parentNode;
                if (parent.nextSibling) {
                    parent.parentNode?.insertBefore(screenshotButton, parent.nextSibling);
                } else {
                    parent.parentNode?.appendChild(screenshotButton);
                }
            } else {
                // Fallback: insert at the beginning of controls container
                controlsContainer.insertBefore(screenshotButton, controlsContainer.firstChild);
            }

            // Store reference to this button
            this.screenshotButtons.set(entryId, screenshotButton);
        } catch (error) {
            logError('Error adding screenshot button to entry:', error);
        }
    }

    /**
     * Create a screenshot button element
     */
    private createScreenshotButton(entry: HTMLElement): HTMLElement {
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-screenshot-button');

        // Create camera icon using IconComponent with a specific class for easier selection
        const cameraIcon = this.iconComponent.create({
            name: 'photo_camera',
            size: 'small',
            color: '#8e9ed9', // Different color from copy button
            className: 'eksi-screenshot-icon' // Add specific class for easier targeting in transitions
        });

        // Append the icon to the button container
        this.domHandler.appendChild(buttonContainer, cameraIcon);

        // Add click listener to take screenshot of the entry
        this.domHandler.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.captureEntryScreenshot(entry, buttonContainer);
        });

        return buttonContainer;
    }

    /**
     * Capture a screenshot of the entry and download it
     */
    private captureEntryScreenshot(entry: HTMLElement, button: HTMLElement): void {
        try {
            // Show processing state
            this.showProcessingState(button);

            // Find the content element
            const contentElement = entry.querySelector('.content');

            if (!contentElement) {
                throw new Error('Could not find entry content element');
            }

            // Get author and date info
            const author = entry.getAttribute('data-author') || 'anonymous';
            const entryId = entry.getAttribute('data-id') || Date.now().toString();

            // Get timestamp if available
            let timestamp = '';
            const timeElement = entry.querySelector('.entry-date');
            if (timeElement) {
                timestamp = timeElement.textContent || '';
            }

            // Create a container for the screenshot with styling
            const container = document.createElement('div');
            container.style.padding = '15px';
            container.style.backgroundColor = '#242424';
            container.style.color = '#fff';
            container.style.borderRadius = '8px';
            container.style.maxWidth = '700px';
            container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

            // Clone the content to avoid modifying the original
            const contentClone = contentElement.cloneNode(true) as HTMLElement;

            // Create header with author and date
            const header = document.createElement('div');
            header.style.marginBottom = '10px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.opacity = '0.8';
            header.style.fontSize = '14px';

            header.innerHTML = `
                <div style="font-weight: bold;">${author}</div>
                <div>${timestamp}</div>
            `;

            // Create footer with extension branding
            const footer = document.createElement('div');
            footer.style.marginTop = '15px';
            footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
            footer.style.paddingTop = '10px';
            footer.style.fontSize = '12px';
            footer.style.color = 'rgba(255, 255, 255, 0.5)';
            footer.style.textAlign = 'right';
            footer.textContent = 'Ekşi Artı ile alındı • eksisozluk.com/' + entryId;

            // Assemble the screenshot container
            container.appendChild(header);
            container.appendChild(contentClone);
            container.appendChild(footer);

            // Add container to body temporarily (invisible)
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            // Use html2canvas to capture screenshot
            html2canvas(container, {
                backgroundColor: '#242424',
                scale: 2,
                logging: false,
                allowTaint: true,
                useCORS: true
            }).then((canvas: HTMLCanvasElement) => {
                // Convert to image and trigger download
                const image = canvas.toDataURL('image/png');
                this.downloadScreenshot(image, author, entryId);

                // Show success state
                this.showSuccessState(button);

                // Remove the temporary container
                document.body.removeChild(container);
            }).catch((error: Error) => {
                logError('Error generating screenshot:', error);
                this.showErrorState(button);
                document.body.removeChild(container);
            });

        } catch (error) {
            logError('Error capturing entry screenshot:', error);
            this.showErrorState(button);
        }
    }

    /**
     * Download the screenshot as a PNG file
     */
    private downloadScreenshot(imageData: string, author: string, entryId: string): void {
        try {
            // Create a download link
            const link = document.createElement('a');
            link.href = imageData;

            // Create filename with author and entry ID
            const date = new Date().toISOString().slice(0, 10);
            const filename = `eksisozluk-${author}-${entryId}-${date}.png`;

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            logError('Error downloading screenshot:', error);
        }
    }

    /**
     * Show processing state on the button
     */
    private showProcessingState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;

            // Change to loading icon
            iconElement.textContent = 'hourglass_empty';
            iconElement.style.color = '#8e9ed9';

            // Add processing animation
            this.domHandler.addClass(iconElement, 'eksi-screenshot-processing');
        } catch (error) {
            logError('Error showing processing state:', error);
        }
    }

    /**
     * Show success state on the button
     */
    private showSuccessState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;

            // Remove processing animation
            this.domHandler.removeClass(iconElement, 'eksi-screenshot-processing');

            // Use IconComponent to show success state
            this.iconComponent.showSuccessState(iconElement, 1500);

            // Reset to camera icon after success animation
            setTimeout(() => {
                iconElement.textContent = 'photo_camera';
                iconElement.style.color = '#8e9ed9';
            }, 1500);
        } catch (error) {
            logError('Error showing success state:', error);
        }
    }

    /**
     * Show error state on the button
     */
    private showErrorState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;

            // Remove processing animation
            this.domHandler.removeClass(iconElement, 'eksi-screenshot-processing');

            // Use IconComponent to show error state
            this.iconComponent.showErrorState(iconElement, 1500);

            // Reset to camera icon after error animation
            setTimeout(() => {
                iconElement.textContent = 'photo_camera';
                iconElement.style.color = '#8e9ed9';
            }, 1500);
        } catch (error) {
            logError('Error showing error state:', error);
        }
    }

    /**
     * Observe DOM for new entries to add screenshot buttons
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
                    setTimeout(() => this.addScreenshotButtonsToEntries(), 100);
                }
            });

            // Start observing the document body for DOM changes
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } catch (error) {
            logError('Error setting up mutation observer:', error);

            // Fallback to periodic checking if MutationObserver fails
            setInterval(() => {
                if (document.readyState === 'complete') {
                    this.addScreenshotButtonsToEntries();
                }
            }, 2000);
        }
    }

    /**
     * Cleanup resources when component is destroyed
     */
    public destroy(): void {
        // Clear any references or timers
        this.screenshotButtons.clear();
    }
}