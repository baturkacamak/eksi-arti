import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { IconComponent } from '../shared/icon-component';
import html2canvas from 'html2canvas';
import { ContainerService } from '../../services/features/ui/container-service';
import { ObserverService } from '../../services/shared/observer-service';
import { ICSSService } from "../../interfaces/services/shared/ICSSService";
import { ILoggingService } from "../../interfaces/services/shared/ILoggingService";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";
import { IObserverService } from "../../interfaces/services/shared/IObserverService";
import { IScreenshotButtonComponent } from "../../interfaces/components/IScreenshotButtonComponent";
import { IIconComponent } from "../../interfaces/components/IIconComponent";
import { IDocumentStateService } from '../../interfaces/services/shared/IDocumentStateService';
import { buildUrl } from '../../constants';

/**
 * ScreenshotButtonComponent
 * Adds screenshot buttons to entry controls for capturing entry images
 * with support for both downloading and copying to clipboard
 */
export class ScreenshotButtonComponent extends BaseFeatureComponent implements IScreenshotButtonComponent {
    private screenshotButtons: Map<string, HTMLElement> = new Map();
    private inTransition: Set<HTMLElement> = new Set(); // Track buttons currently in transition
    private static html2canvasLoadPromise: Promise<void> | null = null; // Singleton promise for loading html2canvas
    
    // Icon configuration constants
    private static readonly SCREENSHOT_ICONS = {
        DEFAULT: 'photo_camera',
        PROCESSING: 'hourglass_empty',
        SUCCESS_DOWNLOAD: 'check_circle',
        SUCCESS_CLIPBOARD: 'assignment_turned_in',
        ERROR: 'error_outline'
    } as const;
    
    private static readonly SCREENSHOT_COLORS = {
        DEFAULT: '#8e9ed9',
        PROCESSING: '#8e9ed9',
        SUCCESS: '#43a047',
        ERROR: '#d9534f'
    } as const;

    constructor(
        domService: IDOMService,
        cssService: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: ContainerService,
        private documentStateService: IDocumentStateService,
        options?: FeatureComponentOptions
    ) {
        super(domService, cssService, loggingService, observerServiceInstance, iconComponent, options);
    }

    protected getStyles(): string | null {
        return `
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
                overflow: initial;
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
    }

    protected shouldInitialize(): boolean {
        return true;
    }

    protected setupUI(): void {
        this.loggingService.debug('ScreenshotButtonComponent UI setup via observer.');
    }

    protected registerObservers(): void {
    }
    
    protected async postInitialize(): Promise<void> {
        try {
            await this.loadHtml2Canvas();
            this.observerId = this.observerServiceInstance.observe({
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
            this.loggingService.debug('Screenshot button observer registered after html2canvas load.');
        } catch (error) {
            this.loggingService.error('Error in postInitialize (loading html2canvas or setting observer):', error);
            this.handleInitializationError(error);
        }
    }

    protected cleanup(): void {
        this.screenshotButtons.clear();
    }

    /**
     * Get the screenshot icon element from a button, with error handling
     */
    private getIconElement(button: HTMLElement): HTMLElement | null {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) {
                this.loggingService.warn('Screenshot icon element not found in button');
                return null;
            }
            return iconElement;
        } catch (error) {
            this.loggingService.error('Error getting screenshot icon element:', error);
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
     * Show temporary state and revert after delay
     */
    private showTemporaryState(
        button: HTMLElement, 
        tempIcon: string, 
        tempColor: string, 
        finalCallback: () => void, 
        delay: number = 1500
    ): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;

        this.domService.removeClass(iconElement, 'eksi-screenshot-processing');
        this.updateIconAppearance(iconElement, tempIcon, tempColor);
        
        setTimeout(finalCallback, delay);
    }

    /**
     * Dynamically load html2canvas library (singleton pattern to avoid multiple script tags)
     */
    private async loadHtml2Canvas(): Promise<void> {
        // Return existing promise if loading is already in progress or completed
        if (ScreenshotButtonComponent.html2canvasLoadPromise) {
            return ScreenshotButtonComponent.html2canvasLoadPromise;
        }

        // Check if html2canvas is already available
        if (typeof (window as any).html2canvas !== 'undefined') {
            ScreenshotButtonComponent.html2canvasLoadPromise = Promise.resolve();
            return ScreenshotButtonComponent.html2canvasLoadPromise;
        }

        // Check if script tag already exists to avoid duplicate injections
        const existingScript = document.querySelector('script[src*="html2canvas.min.js"]');
        if (existingScript) {
            this.loggingService.debug('html2canvas script already exists, waiting for it to load...');
            ScreenshotButtonComponent.html2canvasLoadPromise = new Promise<void>((resolve, reject) => {
                const checkLoaded = () => {
                    if (typeof (window as any).html2canvas !== 'undefined') {
                        this.loggingService.debug('html2canvas loaded from existing script.');
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100); // Check every 100ms
                    }
                };
                checkLoaded();
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    reject(new Error('Timeout waiting for existing html2canvas script to load'));
                }, 10000);
            });
            return ScreenshotButtonComponent.html2canvasLoadPromise;
        }

        // Create new script tag
        ScreenshotButtonComponent.html2canvasLoadPromise = new Promise<void>((resolve, reject) => {
            try {
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('lib/html2canvas.min.js');
                script.onload = () => {
                    this.loggingService.debug('html2canvas loaded successfully.');
                    resolve();
                };
                script.onerror = (err) => {
                    this.loggingService.error('Failed to load html2canvas:', err);
                    ScreenshotButtonComponent.html2canvasLoadPromise = null; // Reset on error
                    reject(new Error('Failed to load html2canvas'));
                };
                document.head.appendChild(script);
            } catch (error) {
                this.loggingService.error('Exception during html2canvas load initiation:', error);
                ScreenshotButtonComponent.html2canvasLoadPromise = null; // Reset on error
                reject(error);
            }
        });

        return ScreenshotButtonComponent.html2canvasLoadPromise;
    }

    /**
     * Add a screenshot button to a specific entry
     */
    private addScreenshotButtonToEntry(entry: HTMLElement): void {
        try {
            const entryId = entry.getAttribute('data-id');
            if (!entryId || this.screenshotButtons.has(entryId)) return;

            const container = this.specificContainerService.getEntryControlsContainer(entry);
            const screenshotButton = this.createScreenshotButtonElement(entry);
            container.add(screenshotButton);
            this.screenshotButtons.set(entryId, screenshotButton);
        } catch (error) {
          this.loggingService.error('Error adding screenshot button to entry:', error);
        }
    }

    /**
     * Create a screenshot button element
     */
    private createScreenshotButtonElement(entry: HTMLElement): HTMLElement {
        const buttonContainer = this.domService.createElement('span');
        this.domService.addClass(buttonContainer, 'eksi-screenshot-button');
        this.domService.addClass(buttonContainer, 'eksi-button');

        const cameraIcon = this.iconComponent.create({
            name: 'photo_camera',
            size: 'small',
            color: '#8e9ed9',
            className: 'eksi-screenshot-icon'
        });

        const optionsMenu = this.createOptionsMenu(entry);
        this.domService.appendChild(buttonContainer, cameraIcon);
        this.domService.appendChild(buttonContainer, optionsMenu);

        this.domService.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleOptionsMenu(optionsMenu);
        });

        document.addEventListener('click', (e) => {
            if (!buttonContainer.contains(e.target as Node) && this.domService.hasClass(optionsMenu, 'visible')) {
                this.domService.removeClass(optionsMenu, 'visible');
            }
        });

        return buttonContainer;
    }

    private createOptionsMenu(entry: HTMLElement): HTMLElement {
        const optionsMenu = this.domService.createElement('div');
        this.domService.addClass(optionsMenu, 'eksi-screenshot-options');

        const downloadOption = this.domService.createElement('div');
        this.domService.addClass(downloadOption, 'eksi-screenshot-option');
        const downloadIcon = this.iconComponent.create({ name: 'download', size: 'small', color: '#8e9ed9' });
        downloadOption.appendChild(downloadIcon);
        downloadOption.appendChild(document.createTextNode('İndir'));

        const clipboardOption = this.domService.createElement('div');
        this.domService.addClass(clipboardOption, 'eksi-screenshot-option');
        const clipboardIcon = this.iconComponent.create({ name: 'content_copy', size: 'small', color: '#8e9ed9' });
        clipboardOption.appendChild(clipboardIcon);
        clipboardOption.appendChild(document.createTextNode('Panoya Kopyala'));

        const handleOptionClick = (action: 'download' | 'clipboard') => (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.domService.removeClass(optionsMenu, 'visible');
            const parentElement = optionsMenu.parentElement;
            if (parentElement) {
                this.captureEntryScreenshot(entry, parentElement, action);
            }
        };

        this.domService.addEventListener(downloadOption, 'click', handleOptionClick('download'));
        this.domService.addEventListener(clipboardOption, 'click', handleOptionClick('clipboard'));

        this.domService.appendChild(optionsMenu, downloadOption);
        this.domService.appendChild(optionsMenu, clipboardOption);
        return optionsMenu;
    }

    private toggleOptionsMenu(menu: HTMLElement): void {
        if (this.domService.hasClass(menu, 'visible')) {
            this.domService.removeClass(menu, 'visible');
        } else {
            this.domService.addClass(menu, 'visible');
        }
    }

    private captureEntryScreenshot(entry: HTMLElement, button: HTMLElement, action: 'download' | 'clipboard'): void {
        try {
            this.showProcessingState(button);
            const contentElement = entry.querySelector('.content');
            if (!contentElement) throw new Error('Could not find entry content element');

            const author = entry.getAttribute('data-author') || 'anonymous';
            const entryId = entry.getAttribute('data-id') || Date.now().toString();
            let timestamp = '';
            const timeElement = entry.querySelector('.entry-date');
            if (timeElement) timestamp = timeElement.textContent || '';

            const container = document.createElement('div');
            container.style.padding = '15px';
            container.style.backgroundColor = '#242424';
            container.style.color = '#fff';
            container.style.borderRadius = '8px';
            container.style.maxWidth = '700px';
            container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

            const contentClone = contentElement.cloneNode(true) as HTMLElement;
            const header = document.createElement('div');
            header.style.marginBottom = '10px';
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.opacity = '0.8';
            header.style.fontSize = '14px';
            header.innerHTML = `<div style="font-weight: bold;">${author}</div><div>${timestamp}</div>`;

            const footer = document.createElement('div');
            footer.style.marginTop = '15px';
            footer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
            footer.style.paddingTop = '10px';
            footer.style.fontSize = '12px';
            footer.style.color = 'rgba(255, 255, 255, 0.5)';
            footer.style.textAlign = 'right';
            footer.textContent = 'Ekşi Artı ile alındı • ' + buildUrl(entryId);

            container.appendChild(header);
            container.appendChild(contentClone);
            container.appendChild(footer);

            container.style.position = 'fixed';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            html2canvas(container, {
                backgroundColor: '#242424',
                scale: 2,
                logging: false,
                allowTaint: true,
                useCORS: true
            }).then(async (canvas: HTMLCanvasElement) => {
                const image = canvas.toDataURL('image/png');
                if (action === 'download') {
                    try {
                        await this.downloadScreenshot(image, author, entryId);
                        this.showSuccessState(button, 'download');
                    } catch (error) {
                        this.loggingService.error('Error downloading screenshot:', error);
                        this.showErrorState(button);
                    }
                } else if (action === 'clipboard') {
                    this.copyToClipboard(canvas)
                        .then(() => this.showSuccessState(button, 'clipboard'))
                        .catch((error) => {
                            this.loggingService.error('Error copying to clipboard:', error);
                            this.showErrorState(button);
                        });
                }
                document.body.removeChild(container);
            }).catch((error: Error) => {
                this.loggingService.error('Error generating screenshot:', error);
                this.showErrorState(button);
                document.body.removeChild(container);
            });
        } catch (error) {
            this.loggingService.error('Error capturing entry screenshot:', error);
            if (button) this.showErrorState(button);
        }
    }

    private async downloadScreenshot(imageData: string, author: string, entryId: string): Promise<void> {
        try {
            const date = new Date().toISOString().slice(0, 10);
            const filename = `eksisozluk-${author}-${entryId}-${date}.png`;

            if (typeof chrome !== 'undefined' && chrome.downloads) {
                // Use Chrome Downloads API (MV3)
                await chrome.downloads.download({
                    url: imageData,
                    filename: filename,
                    conflictAction: 'uniquify'
                });
                this.loggingService.debug('Screenshot downloaded using Chrome Downloads API:', filename);
            } else {
                // Fallback to traditional method for non-extension environments
                const link = this.domService.createElement('a');
                link.href = imageData;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.loggingService.debug('Screenshot downloaded using fallback method:', filename);
            }
        } catch (error) {
            this.loggingService.error('Error downloading screenshot:', error);
            throw error;
        }
    }

    private async copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
        try {
            // Store current focus and ensure document has focus for clipboard operations
            const storedFocus = this.documentStateService.storeFocus();
            this.documentStateService.focusElement(document.body);
            
            // Use DocumentStateService for clipboard operations
            const success = await this.documentStateService.copyImageToClipboard(canvas);
            
            // Restore focus
            this.documentStateService.restoreFocus(storedFocus || undefined);
            
            if (!success) {
                throw new Error('Failed to copy image to clipboard');
            }
            
            this.loggingService.debug('Image copied to clipboard successfully');
        } catch (error) {
            this.loggingService.error('Clipboard copy failed:', error);
            throw error;
        }
    }

    private showProcessingState(button: HTMLElement): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;
        
        this.updateIconAppearance(
            iconElement, 
            ScreenshotButtonComponent.SCREENSHOT_ICONS.PROCESSING, 
            ScreenshotButtonComponent.SCREENSHOT_COLORS.PROCESSING
        );
        this.domService.addClass(iconElement, 'eksi-screenshot-processing');
    }

    private showSuccessState(button: HTMLElement, action: 'download' | 'clipboard'): void {
        const iconElement = this.getIconElement(button);
        if (!iconElement) return;

        const successIcon = action === 'download' 
            ? ScreenshotButtonComponent.SCREENSHOT_ICONS.SUCCESS_DOWNLOAD
            : ScreenshotButtonComponent.SCREENSHOT_ICONS.SUCCESS_CLIPBOARD;

        this.domService.removeClass(iconElement, 'eksi-screenshot-processing');
        this.updateIconAppearance(iconElement, successIcon, ScreenshotButtonComponent.SCREENSHOT_COLORS.SUCCESS);
        this.domService.addClass(iconElement, 'eksi-screenshot-success');
        
        setTimeout(() => {
            this.domService.removeClass(iconElement, 'eksi-screenshot-success');
            setTimeout(() => {
                this.updateIconAppearance(
                    iconElement, 
                    ScreenshotButtonComponent.SCREENSHOT_ICONS.DEFAULT, 
                    ScreenshotButtonComponent.SCREENSHOT_COLORS.DEFAULT
                );
            }, 200);
        }, 1500);
    }

    private showErrorState(button: HTMLElement): void {
        this.showTemporaryState(
            button,
            ScreenshotButtonComponent.SCREENSHOT_ICONS.ERROR,
            ScreenshotButtonComponent.SCREENSHOT_COLORS.ERROR,
            () => {
                const iconElement = this.getIconElement(button);
                if (iconElement) {
                    this.updateIconAppearance(
                        iconElement, 
                        ScreenshotButtonComponent.SCREENSHOT_ICONS.DEFAULT, 
                        ScreenshotButtonComponent.SCREENSHOT_COLORS.DEFAULT
                    );
                }
            }
        );
    }
}