export interface FontConfig {
    fontFamily: string;
    fontUrl: string;
    version?: string;
    fallbackTimeout?: number;
}

export interface FontLoadingCallbacks {
    onLoad?: () => void;
    onError?: (error: Error) => void;
    onElementReady?: (element: HTMLElement) => void;
}

export interface IFontLoaderService {
    /**
     * Load a font and return a promise that resolves when loaded
     */
    loadFont(config: FontConfig, callbacks?: FontLoadingCallbacks): Promise<boolean>;
    
    /**
     * Check if a font is already loaded
     */
    isFontLoaded(fontFamily: string): boolean;
    
    /**
     * Register an element to be notified when font loads
     */
    registerPendingElement(element: HTMLElement, loadingClass?: string, loadedClass?: string): void;
    
    /**
     * Unregister an element from pending notifications
     */
    unregisterPendingElement(element: HTMLElement): void;
    
    /**
     * Get the current loading status of a font
     */
    getFontStatus(fontFamily: string): 'not-loaded' | 'loading' | 'loaded' | 'error';
    
    /**
     * Register a font family for tracking without loading it immediately
     */
    registerFontFamily(fontFamily: string): void;
    
    /**
     * Get all registered font families
     */
    getRegisteredFonts(): string[];
} 