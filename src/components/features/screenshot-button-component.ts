import { BaseFeatureComponent, FeatureComponentOptions } from './base-feature-component';
import { IconComponent } from '../shared/icon-component';
import html2canvas from 'html2canvas';
import { ContainerService } from "../../services/container-service";
import { ObserverService, observerService as globalObserverService } from "../../services/observer-service";
import { ICSSService } from "../../interfaces/services/ICSSService";
import { ILoggingService } from "../../interfaces/services/ILoggingService";
import { IDOMService } from "../../interfaces/services/IDOMService";
import { IObserverService } from "../../interfaces/services/IObserverService";
import { IScreenshotButtonComponent } from "../../interfaces/components/IScreenshotButtonComponent";
import { IIconComponent } from "../../interfaces/components/IIconComponent";

/**
 * ScreenshotButtonComponent
 * Adds screenshot buttons to entry controls for capturing entry images
 * with support for both downloading and copying to clipboard
 */
export class ScreenshotButtonComponent extends BaseFeatureComponent implements IScreenshotButtonComponent {
    private screenshotButtons: Map<string, HTMLElement> = new Map();
    private inTransition: Set<HTMLElement> = new Set(); // Track buttons currently in transition

    constructor(
        domHandler: IDOMService,
        cssHandler: ICSSService,
        loggingService: ILoggingService,
        iconComponent: IIconComponent,
        observerServiceInstance: IObserverService,
        private specificContainerService: ContainerService,
        options?: FeatureComponentOptions
    ) {
        super(domHandler, cssHandler, loggingService, observerServiceInstance, iconComponent, options);
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
     * Dynamically load html2canvas library
     */
    private async loadHtml2Canvas(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                if (typeof (window as any).html2canvas !== 'undefined') {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = chrome.runtime.getURL('lib/html2canvas.min.js');
                script.onload = () => {
                    this.loggingService.debug('html2canvas loaded successfully.');
                    resolve();
                };
                script.onerror = (err) => {
                    this.loggingService.error('Failed to load html2canvas:', err);
                    reject(new Error('Failed to load html2canvas'));
                };
                document.head.appendChild(script);
            } catch (error) {
                this.loggingService.error('Exception during html2canvas load initiation:', error);
                reject(error);
            }
        });
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
        const buttonContainer = this.domHandler.createElement('span');
        this.domHandler.addClass(buttonContainer, 'eksi-screenshot-button');
        this.domHandler.addClass(buttonContainer, 'eksi-button');

        const cameraIcon = this.iconComponent.create({
            name: 'photo_camera',
            size: 'small',
            color: '#8e9ed9',
            className: 'eksi-screenshot-icon'
        });

        const optionsMenu = this.createOptionsMenu(entry);
        this.domHandler.appendChild(buttonContainer, cameraIcon);
        this.domHandler.appendChild(buttonContainer, optionsMenu);

        this.domHandler.addEventListener(buttonContainer, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleOptionsMenu(optionsMenu);
        });

        document.addEventListener('click', (e) => {
            if (!buttonContainer.contains(e.target as Node) && this.domHandler.hasClass(optionsMenu, 'visible')) {
                this.domHandler.removeClass(optionsMenu, 'visible');
            }
        });

        return buttonContainer;
    }

    private createOptionsMenu(entry: HTMLElement): HTMLElement {
        const optionsMenu = this.domHandler.createElement('div');
        this.domHandler.addClass(optionsMenu, 'eksi-screenshot-options');

        const downloadOption = this.domHandler.createElement('div');
        this.domHandler.addClass(downloadOption, 'eksi-screenshot-option');
        const downloadIcon = this.iconComponent.create({ name: 'download', size: 'small', color: '#8e9ed9' });
        downloadOption.appendChild(downloadIcon);
        downloadOption.appendChild(document.createTextNode('İndir'));

        const clipboardOption = this.domHandler.createElement('div');
        this.domHandler.addClass(clipboardOption, 'eksi-screenshot-option');
        const clipboardIcon = this.iconComponent.create({ name: 'content_copy', size: 'small', color: '#8e9ed9' });
        clipboardOption.appendChild(clipboardIcon);
        clipboardOption.appendChild(document.createTextNode('Panoya Kopyala'));

        const handleOptionClick = (action: 'download' | 'clipboard') => (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            this.domHandler.removeClass(optionsMenu, 'visible');
            const parentElement = optionsMenu.parentElement;
            if (parentElement) {
                this.captureEntryScreenshot(entry, parentElement, action);
            }
        };

        this.domHandler.addEventListener(downloadOption, 'click', handleOptionClick('download'));
        this.domHandler.addEventListener(clipboardOption, 'click', handleOptionClick('clipboard'));

        this.domHandler.appendChild(optionsMenu, downloadOption);
        this.domHandler.appendChild(optionsMenu, clipboardOption);
        return optionsMenu;
    }

    private toggleOptionsMenu(menu: HTMLElement): void {
        if (this.domHandler.hasClass(menu, 'visible')) {
            this.domHandler.removeClass(menu, 'visible');
        } else {
            this.domHandler.addClass(menu, 'visible');
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
            footer.textContent = 'Ekşi Artı ile alındı • eksisozluk.com/' + entryId;

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
            }).then((canvas: HTMLCanvasElement) => {
                const image = canvas.toDataURL('image/png');
                if (action === 'download') {
                    this.downloadScreenshot(image, author, entryId);
                    this.showSuccessState(button, 'download');
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

    private downloadScreenshot(imageData: string, author: string, entryId: string): void {
        try {
            const link = document.createElement('a');
            link.href = imageData;
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

    private async copyToClipboard(canvas: HTMLCanvasElement): Promise<void> {
        try {
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
                        } catch (error) { reject(error); }
                    }, 'image/png');
                });
            } else {
                const img = document.createElement('img');
                img.src = canvas.toDataURL('image/png');
                const container = document.createElement('div');
                container.appendChild(img);
                container.style.position = 'fixed';
                container.style.left = '-9999px';
                document.body.appendChild(container);
                const range = document.createRange();
                range.selectNode(img);
                const selection = window.getSelection();
                if (!selection) throw new Error('Could not get window selection object');
                selection.removeAllRanges();
                selection.addRange(range);
                if (!document.execCommand('copy')) throw new Error('Failed to copy image using execCommand');
                selection.removeAllRanges();
                document.body.removeChild(container);
                this.loggingService.debug('Image copied to clipboard using execCommand');
            }
        } catch (error) {
            this.loggingService.error('Clipboard copy failed:', error);
            throw error;
        }
    }

    private showProcessingState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;
            iconElement.textContent = 'hourglass_empty';
            iconElement.style.color = '#8e9ed9';
            this.domHandler.addClass(iconElement, 'eksi-screenshot-processing');
        } catch (error) {
            this.loggingService.error('Error showing processing state:', error);
        }
    }

    private showSuccessState(button: HTMLElement, action: 'download' | 'clipboard'): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;
            this.domHandler.removeClass(iconElement, 'eksi-screenshot-processing');
            iconElement.textContent = action === 'download' ? 'check_circle' : 'assignment_turned_in';
            iconElement.style.color = '#43a047';
            this.domHandler.addClass(iconElement, 'eksi-screenshot-success');
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

    private showErrorState(button: HTMLElement): void {
        try {
            const iconElement = button.querySelector('.eksi-screenshot-icon') as HTMLElement;
            if (!iconElement) return;
            this.domHandler.removeClass(iconElement, 'eksi-screenshot-processing');
            iconElement.textContent = 'error_outline';
            iconElement.style.color = '#d9534f';

            setTimeout(() => {
                iconElement.textContent = 'photo_camera';
                iconElement.style.color = '#8e9ed9';
            }, 1500);
        } catch (error) {
            this.loggingService.error('Error showing error state:', error);
        }
    }
}