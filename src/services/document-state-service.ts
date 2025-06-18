import { IDocumentStateService } from '../interfaces/services/IDocumentStateService';
import { ILoggingService } from '../interfaces/services/ILoggingService';
import { IDOMService } from '../interfaces/services/IDOMService';

export class DocumentStateService implements IDocumentStateService {
    private storedFocusElement: Element | null = null;

    constructor(
        private loggingService: ILoggingService,
        private domService: IDOMService
    ) {}

    // Scroll management
    setScrollEnabled(enabled: boolean): void {
        const overflowValue = enabled ? '' : 'hidden';
        
        document.body.style.overflow = overflowValue;
        document.documentElement.style.overflow = overflowValue;
    }

    // Viewport information
    getViewportSize(): { width: number, height: number } {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    getElementPosition(element: HTMLElement): DOMRect {
        return element.getBoundingClientRect();
    }

    isElementInViewport(element: HTMLElement): boolean {
        const rect = this.getElementPosition(element);
        const viewport = this.getViewportSize();
        
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= viewport.height &&
            rect.right <= viewport.width
        );
    }

    // Theme/appearance
    isDarkMode(): boolean {
        const body = this.domService.querySelector('body');
        return (body?.classList.contains('dark-theme')) ||
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Clipboard operations
    async copyTextToClipboard(text: string): Promise<boolean> {
        try {
            // Ensure document has focus for clipboard operations
            this.ensureDocumentFocus();
            
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = this.domService.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                
                this.appendTemporaryElement(textArea);
                textArea.focus();
                textArea.select();

                const success = document.execCommand('copy');
                this.removeTemporaryElement(textArea);
                return success;
            }
        } catch (error) {
            this.loggingService.error('Error copying text to clipboard:', error);
            return false;
        }
    }

    async copyImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
        try {
            // Ensure document has focus for clipboard operations
            this.ensureDocumentFocus();
            
            if (navigator.clipboard && navigator.clipboard.write) {
                return new Promise<boolean>((resolve) => {
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            resolve(false);
                            return;
                        }
                        try {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            this.loggingService.debug("Image copied to clipboard using Clipboard API");
                            resolve(true);
                        } catch (error) {
                            this.loggingService.error("Clipboard API failed:", error);
                            resolve(false);
                        }
                    }, "image/png");
                });
            } else {
                // Fallback for older browsers
                const img = this.domService.createElement("img");
                img.src = canvas.toDataURL("image/png");
                const container = this.domService.createElement("div");
                this.domService.appendChild(container, img);
                container.style.position = "fixed";
                container.style.left = "-9999px";
                
                this.appendTemporaryElement(container);
                
                const range = document.createRange();
                range.selectNode(img);
                const selection = window.getSelection();
                if (!selection) {
                    this.removeTemporaryElement(container);
                    return false;
                }
                
                selection.removeAllRanges();
                selection.addRange(range);
                const successful = document.execCommand("copy");
                selection.removeAllRanges();
                
                this.removeTemporaryElement(container);
                this.loggingService.debug("Image copied to clipboard using execCommand");
                return successful;
            }
        } catch (error) {
            this.loggingService.error("Error copying image to clipboard:", error);
            return false;
        }
    }

    // Helper method to ensure document has focus for clipboard operations
    private ensureDocumentFocus(): void {
        try {
            // Check if document is currently focused
            if (!document.hasFocus()) {
                // Try to bring focus back to the document
                window.focus();
                document.body.focus();
            }
        } catch (error) {
            this.loggingService.debug('Error ensuring document focus:', error);
        }
    }

    // Document creation utilities
    createDocumentFragment(): DocumentFragment {
        return document.createDocumentFragment();
    }

    createTextNode(text: string): Text {
        return this.domService.createTextNode(text);
    }

    // Focus management
    focusElement(element: HTMLElement): void {
        try {
            element.focus();
        } catch (error) {
            this.loggingService.debug('Error focusing element:', error);
        }
    }

    getActiveElement(): Element | null {
        return document.activeElement;
    }

    storeFocus(): Element | null {
        this.storedFocusElement = document.activeElement;
        return this.storedFocusElement;
    }

    restoreFocus(element?: Element): void {
        const elementToFocus = element || this.storedFocusElement;
        if (elementToFocus && elementToFocus instanceof HTMLElement) {
            this.focusElement(elementToFocus);
            this.storedFocusElement = null;
        }
    }

    // Temporary element management
    appendTemporaryElement(element: HTMLElement): void {
        this.domService.appendChild(document.body, element);
    }

    removeTemporaryElement(element: HTMLElement): void {
        if (element.parentNode === document.body) {
            this.domService.removeChild(document.body, element);
        }
    }

    // Position utilities
    keepElementInViewport(element: HTMLElement, padding: number = 10): void {
        const rect = this.getElementPosition(element);
        const viewport = this.getViewportSize();
        
        let { left, top } = rect;
        
        // Adjust horizontal position
        if (left < padding) {
            element.style.left = `${padding}px`;
        } else if (left + rect.width > viewport.width - padding) {
            element.style.left = `${viewport.width - rect.width - padding}px`;
        }
        
        // Adjust vertical position
        if (top < padding) {
            element.style.top = `${padding}px`;
        } else if (top + rect.height > viewport.height - padding) {
            element.style.top = `${viewport.height - rect.height - padding}px`;
        }
    }
} 