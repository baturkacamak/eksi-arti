export interface IDocumentStateService {
    // Scroll management
    setScrollEnabled(enabled: boolean): void;
    
    // Viewport information
    getViewportSize(): { width: number, height: number };
    getElementPosition(element: HTMLElement): DOMRect;
    isElementInViewport(element: HTMLElement): boolean;
    
    // Theme/appearance
    isDarkMode(): boolean;
    
    // Clipboard operations
    copyTextToClipboard(text: string): Promise<boolean>;
    copyImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean>;
    
    // Document creation utilities
    createDocumentFragment(): DocumentFragment;
    createTextNode(text: string): Text;
    
    // Focus management
    focusElement(element: HTMLElement): void;
    getActiveElement(): Element | null;
    storeFocus(): Element | null;
    restoreFocus(element?: Element): void;
    
    // Temporary element management
    appendTemporaryElement(element: HTMLElement): void;
    removeTemporaryElement(element: HTMLElement): void;
    
    // Position utilities
    keepElementInViewport(element: HTMLElement, padding?: number): void;
} 