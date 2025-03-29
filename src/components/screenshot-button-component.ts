import { DOMService } from '../services/dom-service';
import { CSSService } from '../services/css-service';
import { IconComponent } from './icon-component';
import { LoggingService} from '../services/logging-service';
import html2canvas from 'html2canvas';
import {containerService} from "../services/container-service";
import {observerService} from "../services/observer-service";

/**
 * ScreenshotButtonComponent
 * Adds screenshot buttons to entry controls for capturing entry images
 * with support for both downloading and copying to clipboard
 */
export class ScreenshotButtonComponent {
    private domHandler: DOMService;
    private cssHandler: CSSService;
    private iconComponent: IconComponent;
    private screenshotButtons: Map<string, HTMLElement> = new Map();
    private static stylesApplied = false;
    private observerId: string = '';
    private loggingService: LoggingService;

    constructor() {
        this.domHandler = new DOMService();
        this.cssHandler = new CSSService();
        this.iconComponent = new IconComponent();
        this.loggingService = new LoggingService();
        this.applyStyles();
    }

    /**
     * Initialize the component by adding screenshot buttons to existing entries
     */
    public initialize(): void {
        try {
            this.loadHtml2Canvas().then(() => {
                this.observerId = observerService.observe({
                    selector: 'li[data-id]',
                    handler: (entries) => {
                        entries.forEach(entry => {
                            if (!this.screenshotButtons.has(entry.getAttribute('data-id') || '')) {
                                this.addScreenshotButtonToEntry(entry as HTMLElement);
                            }
                        });
                    },
                    processExisting: true
                });

                this.applyStyles();
               this.loggingService.debug('Screenshot button component initialized');
            });
        } catch (error) {
          this.loggingService.error('Error initializing screenshot button component:', error);
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
                margin: 0;
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
            
            /* Screenshot options menu styles */
            .eksi-screenshot-options {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 5px;
                background: #fff;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.1);
                z-index: 1000;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-10px);
                transition: all 0.2s ease;
            }
            
            .eksi-screenshot-options.visible {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .eksi-screenshot-option {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                cursor: pointer;
                white-space: nowrap;
                transition: background-color 0.2s ease;
            }
            
            .eksi-screenshot-option:hover {
                background-color: rgba(142, 158, 217, 0.1);
            }
            
            .eksi-screenshot-option .eksi-icon {
                margin-right: 8px;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .eksi-screenshot-options {
                    background: #292a2d;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                
                .eksi-screenshot-option {
                    color: #e0e0e0;
                }
                
                .eksi-screenshot-option:hover {
                    background-color: rgba(142, 158, 217, 0.2);
                }
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

            // Get container from the singleton service
            const container = containerService.getEntryControlsContainer(entry);


            // Create screenshot button
            const screenshotButton = this.createScreenshotButton(entry);

            // Add to container
            container.add(screenshotButton);

            // Store reference
            this.screenshotButtons.set(entryId, screenshotButton);
        } catch (error) {
          this.loggingService.error('Error adding screenshot button to entry:', error);
        }
    }

    /**
     * Create a screenshot button element
     */
    private createScreenshotButton(entry: HTMLElement): HTMLElement {
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-screenshot-button');

        // Create camera icon using IconComponent
        const cameraIcon = this.iconComponent.create({
            name: 'photo_camera',
            size: 'small',
            color: '#8e9ed9',
            className: 'eksi-screenshot-icon'
        });

        // Create options menu
        const optionsMenu = this.createOptionsMenu(entry);

        // Append elements to container
        this.domHandler.appendChild(buttonContainer, cameraIcon);
        this.domHandler.appendChild(buttonContainer, optionsMenu);

        // Add click listener to show options menu
        this.domHandler.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleOptionsMenu(optionsMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!buttonContainer.contains(e.target as Node) && this.domHandler.hasClass(optionsMenu, 'visible')) {
                this.domHandler.removeClass(optionsMenu, 'visible');
            }
        });

        return buttonContainer;
    }

    /**
     * Create options menu for screenshot actions
     */
    private createOptionsMenu(entry: HTMLElement): HTMLElement {
        const optionsMenu = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsMenu, 'eksi-screenshot-options');

        // Create download option
        const downloadOption = this.domHandler.createElement('div');
        this.domHandler.addClass(downloadOption, 'eksi-screenshot-option');

        const downloadIcon = this.iconComponent.create({
            name: 'download',
            size: 'small',
            color: '#8e9ed9'
        });

        downloadOption.appendChild(downloadIcon);
        downloadOption.appendChild(document.createTextNode('İndir'));

        // Create clipboard option
        const clipboardOption = this.domHandler.createElement('div');
        this.domHandler.addClass(clipboardOption, 'eksi-screenshot-option');

        const clipboardIcon = this.iconComponent.create({
            name: 'content_copy',
            size: 'small',
            color: '#8e9ed9'
        });

        clipboardOption.appendChild(clipboardIcon);
        clipboardOption.appendChild(document.createTextNode('Panoya Kopyala'));

        // Add click handlers
        this.domHandler.addEventListener(downloadOption, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.domHandler.removeClass(optionsMenu, 'visible');
            const parentElement = optionsMenu.parentElement;
            if (parentElement) {
                this.captureEntryScreenshot(entry, parentElement, 'download');
            }
        });

        this.domHandler.addEventListener(clipboardOption, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.domHandler.removeClass(optionsMenu, 'visible');
            const parentElement = optionsMenu.parentElement;
            if (parentElement) {
                this.captureEntryScreenshot(entry, parentElement, 'clipboard');
            }
        });

        // Add options to menu
        this.domHandler.appendChild(optionsMenu, downloadOption);
        this.domHandler.appendChild(optionsMenu, clipboardOption);

        return optionsMenu;
    }

    /**
     * Toggle options menu visibility
     */
    private toggleOptionsMenu(menu: HTMLElement): void {
        if (this.domHandler.hasClass(menu, 'visible')) {
            this.domHandler.removeClass(menu, 'visible');
        } else {
            this.domHandler.addClass(menu, 'visible');
        }
    }

    /**
     * Capture a screenshot of the entry and perform the selected action
     */
    private captureEntryScreenshot(entry: HTMLElement, button: HTMLElement, action: 'download' | 'clipboard'): void {
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
                // Convert to image
                const image = canvas.toDataURL('image/png');

                // Perform the selected action
                if (action === 'download') {
                    this.downloadScreenshot(image, author, entryId);
                    this.showSuccessState(button, 'download');
                } else if (action === 'clipboard') {
                    this.copyToClipboard(canvas)
                        .then(() => {
                            this.showSuccessState(button, 'clipboard');
                        })
                        .catch((error) => {
                          this.loggingService.error('Error copying to clipboard:', error);
                            this.showErrorState(button);
                        });
                }

                // Remove the temporary container
                document.body.removeChild(container);
            }).catch((error: Error) => {
              this.loggingService.error('Error generating screenshot:', error);
                this.showErrorState(button);
                document.body.removeChild(container);
            });

        } catch (error) {
          this.loggingService.error('Error capturing entry screenshot:', error);
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
          this.loggingService.error('Error downloading screenshot:', error);
        }
    }

    /**
     * Copy the screenshot to clipboard
     */
    private async copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
        try {
            // Modern approach using Clipboard API
            if (navigator.clipboard && navigator.clipboard.write) {
                return new Promise<void>((resolve, reject) => {
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            reject(new Error('Could not create blob from canvas'));
                            return;
                        }

                        try {
                            const item = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([item]);
                           this.loggingService.debug('Image copied to clipboard using Clipboard API');
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    }, 'image/png');
                });
            }
            // Legacy approach using deprecated execCommand (fallback)
            else {
                // Create a temporary image element
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');

                // Create a div to hold the image
                const container = document.createElement('div');
                container.appendChild(img);
                container.style.position = 'fixed';
                container.style.left = '-9999px';
                document.body.appendChild(container);

                // Select the image
                const range = document.createRange();
                range.selectNode(img);
                const selection = window.getSelection();
                if (!selection) {
                    throw new Error('Could not get window selection object');
                }

                selection.removeAllRanges();
                selection.addRange(range);

                // Execute copy command
                const successful = document.execCommand('copy');
                if (!successful) {
                    throw new Error('Failed to copy image using execCommand');
                }

                // Clean up
                selection.removeAllRanges();
                document.body.removeChild(container);
               this.loggingService.debug('Image copied to clipboard using execCommand');
            }
        } catch (error) {
          this.loggingService.error('Clipboard copy failed:', error);
            // If both methods fail, throw error up to caller
            throw error;
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
          this.loggingService.error('Error showing processing state:', error);
        }
    }

    /**
     * Show success state on the button
     */
    private showSuccessState(button: HTMLElement, action: 'download' | 'clipboard'): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;

            // Remove processing animation
            this.domHandler.removeClass(iconElement, 'eksi-screenshot-processing');

            // Show appropriate success icon based on action
            if (action === 'download') {
                iconElement.textContent = 'check_circle';
            } else if (action === 'clipboard') {
                iconElement.textContent = 'assignment_turned_in';
            }

            iconElement.style.color = '#43a047'; // Success green color

            // Add success animation
            this.domHandler.addClass(iconElement, 'eksi-screenshot-success');

            // Reset to camera icon after animation
            setTimeout(() => {
                this.domHandler.removeClass(iconElement, 'eksi-screenshot-success');
                setTimeout(() => {
                    iconElement.textContent = 'photo_camera';
                    iconElement.style.color = '#8e9ed9';
                }, 200);
            }, 1500);
        } catch (error) {
          this.loggingService.error('Error showing success state:', error);
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
          this.loggingService.error('Error showing error state:', error);
        }
    }

    /**
     * Cleanup resources when component is destroyed
     */
    public destroy(): void {
        // Unregister from observer service
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }

        // Clear references
        this.screenshotButtons.clear();
    }
}