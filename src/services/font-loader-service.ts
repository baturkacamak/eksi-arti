import { IFontLoaderService, FontConfig, FontLoadingCallbacks } from '../interfaces/services/IFontLoaderService';
import { IDOMService } from '../interfaces/services/IDOMService';
import { ILoggingService } from '../interfaces/services/ILoggingService';

interface PendingElement {
    element: HTMLElement;
    loadingClass: string;
    loadedClass: string;
}

interface FontLoadingState {
    status: 'not-loaded' | 'loading' | 'loaded' | 'error';
    pendingElements: Set<PendingElement>;
    config?: FontConfig;
    callbacks?: FontLoadingCallbacks;
    timeoutId?: number;
}

export class FontLoaderService implements IFontLoaderService {
    // Default CSS classes
    private static readonly DEFAULT_LOADING_CLASS = 'font-loading';
    private static readonly DEFAULT_LOADED_CLASS = 'font-loaded';
    
    // Default configuration values
    private static readonly DEFAULT_FALLBACK_TIMEOUT = 2000;
    private static readonly CHECK_COMPLETION_INTERVAL = 50;
    private static readonly FONT_SIZE_CHECK = '1em';
    private static readonly WOFF2_FORMAT = 'woff2';
    
    // Log messages
    private static readonly MESSAGES = {
        ALREADY_LOADED: 'Font {fontFamily} already loaded',
        ALREADY_LOADING: 'Font {fontFamily} is already loading',
        LOAD_SUCCESS: 'Successfully loaded font: {fontFamily}',
        LOAD_ERROR: 'Failed to load font {fontFamily}:',
        LOAD_TIMEOUT: 'Font loading timeout for {fontFamily}, assuming loaded',
        FALLBACK_METHOD: 'Using fallback font loading method for {fontFamily}',
        FONT_LOADED_SUCCESS: 'Font {fontFamily} loaded successfully',
        FONT_LOAD_FAILED: 'Font {fontFamily} failed to load',
        NO_FONT_STATE: 'No font loading state found for {fontFamily}',
        ELEMENT_UNREGISTERED: 'Unregistered element from {fontFamily} pending list',
        FONT_LOADING_ERROR: 'Font loading error for {fontFamily}:',
        FAILED_TO_LOAD: 'Failed to load font: {fontFamily}'
    } as const;

    private fontStates = new Map<string, FontLoadingState>();

    constructor(
        private domService: IDOMService,
        private loggingService: ILoggingService
    ) {}

    public async loadFont(config: FontConfig, callbacks?: FontLoadingCallbacks): Promise<boolean> {
        const { fontFamily, fontUrl, fallbackTimeout = FontLoaderService.DEFAULT_FALLBACK_TIMEOUT } = config;
        
        // Check if font is already loaded
        if (this.isFontLoaded(fontFamily)) {
            this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.ALREADY_LOADED, { fontFamily }));
            callbacks?.onLoad?.();
            return true;
        }

        // Check if font is currently loading
        let fontState = this.fontStates.get(fontFamily);
        if (fontState?.status === 'loading') {
            this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.ALREADY_LOADING, { fontFamily }));
            // Update callbacks if provided
            if (callbacks) {
                fontState.callbacks = callbacks;
            }
            return new Promise((resolve) => {
                // Wait for the current loading to complete
                const checkComplete = () => {
                    const currentState = this.fontStates.get(fontFamily);
                    if (currentState?.status === 'loaded') {
                        resolve(true);
                    } else if (currentState?.status === 'error') {
                        resolve(false);
                    } else {
                        setTimeout(checkComplete, FontLoaderService.CHECK_COMPLETION_INTERVAL);
                    }
                };
                checkComplete();
            });
        }

        // Initialize font state
        fontState = {
            status: 'loading',
            pendingElements: new Set(),
            config,
            callbacks
        };
        this.fontStates.set(fontFamily, fontState);

        try {
            const success = await this.performFontLoading(fontFamily, fontUrl, fallbackTimeout);
            this.handleFontLoadComplete(fontFamily, success);
            return success;
        } catch (error) {
            this.handleFontLoadComplete(fontFamily, false, error as Error);
            return false;
        }
    }

    public isFontLoaded(fontFamily: string): boolean {
        const state = this.fontStates.get(fontFamily);
        return state?.status === 'loaded' || this.checkFontLoaded(fontFamily);
    }

    public registerPendingElement(
        element: HTMLElement, 
        loadingClass: string = FontLoaderService.DEFAULT_LOADING_CLASS, 
        loadedClass: string = FontLoaderService.DEFAULT_LOADED_CLASS
    ): void {
        // Find which font this element is waiting for by checking its font-family
        const computedStyle = window.getComputedStyle(element);
        const fontFamily = computedStyle.fontFamily.replace(/['"]/g, '');
        
        const fontState = this.fontStates.get(fontFamily);
        if (!fontState) {
            this.loggingService.warn(this.formatMessage(FontLoaderService.MESSAGES.NO_FONT_STATE, { fontFamily }));
            return;
        }

        const pendingElement: PendingElement = {
            element,
            loadingClass,
            loadedClass
        };

        fontState.pendingElements.add(pendingElement);

        // Apply loading class if font is not loaded yet
        if (fontState.status !== 'loaded') {
            this.domService.addClass(element, loadingClass);
            this.domService.removeClass(element, loadedClass);
        } else {
            // Font is already loaded, apply loaded class immediately
            this.domService.removeClass(element, loadingClass);
            this.domService.addClass(element, loadedClass);
        }
    }

    public unregisterPendingElement(element: HTMLElement): void {
        // Find and remove the element from all font states
        for (const [fontFamily, fontState] of this.fontStates.entries()) {
            const toRemove = Array.from(fontState.pendingElements).find(pe => pe.element === element);
            if (toRemove) {
                fontState.pendingElements.delete(toRemove);
                this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.ELEMENT_UNREGISTERED, { fontFamily }));
                break;
            }
        }
    }

    public getFontStatus(fontFamily: string): 'not-loaded' | 'loading' | 'loaded' | 'error' {
        const state = this.fontStates.get(fontFamily);
        return state?.status || 'not-loaded';
    }

    /**
     * Register a font family for tracking without loading it immediately
     */
    public registerFontFamily(fontFamily: string): void {
        if (!this.fontStates.has(fontFamily)) {
            this.fontStates.set(fontFamily, {
                status: 'not-loaded',
                pendingElements: new Set()
            });
        }
    }

    /**
     * Get all registered font families
     */
    public getRegisteredFonts(): string[] {
        return Array.from(this.fontStates.keys());
    }

    private async performFontLoading(fontFamily: string, fontUrl: string, fallbackTimeout: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // Set up fallback timeout
            const timeoutId = window.setTimeout(() => {
                this.loggingService.warn(this.formatMessage(FontLoaderService.MESSAGES.LOAD_TIMEOUT, { fontFamily }));
                resolve(true); // Assume success to avoid hanging
            }, fallbackTimeout);

            // Store timeout ID for cleanup
            const fontState = this.fontStates.get(fontFamily);
            if (fontState) {
                fontState.timeoutId = timeoutId;
            }

            if ('fonts' in document) {
                this.loadFontWithFontFaceAPI(fontFamily, fontUrl, timeoutId, resolve, reject);
            } else {
                this.loadFontWithFallback(fontFamily, timeoutId, resolve);
            }
        });
    }

    private loadFontWithFontFaceAPI(
        fontFamily: string, 
        fontUrl: string, 
        timeoutId: number,
        resolve: (value: boolean) => void,
        reject: (reason: Error) => void
    ): void {
        document.fonts.ready.then(() => {
            // Clear timeout since we have a proper response
            clearTimeout(timeoutId);

            // Check if font is already loaded
            if (this.checkFontLoaded(fontFamily)) {
                resolve(true);
                return;
            }

            // Load font explicitly
            const fontFace = new FontFace(
                fontFamily,
                `url(${fontUrl}) format("${FontLoaderService.WOFF2_FORMAT}")`
            );

            fontFace.load()
                .then(() => {
                    document.fonts.add(fontFace);
                    this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.LOAD_SUCCESS, { fontFamily }));
                    resolve(true);
                })
                .catch((error) => {
                    this.loggingService.error(this.formatMessage(FontLoaderService.MESSAGES.LOAD_ERROR, { fontFamily }), error);
                    // Don't reject, resolve with false to allow graceful degradation
                    resolve(false);
                });
        }).catch((error) => {
            clearTimeout(timeoutId);
            this.loggingService.error(this.formatMessage(FontLoaderService.MESSAGES.FONT_LOADING_ERROR, { fontFamily }), error);
            reject(error);
        });
    }

    private loadFontWithFallback(
        fontFamily: string,
        timeoutId: number,
        resolve: (value: boolean) => void
    ): void {
        // For browsers without document.fonts API, we rely on the timeout
        this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.FALLBACK_METHOD, { fontFamily }));
        // The timeout will handle resolution
    }

    private checkFontLoaded(fontFamily: string): boolean {
        if ('fonts' in document) {
            return document.fonts.check(`${FontLoaderService.FONT_SIZE_CHECK} "${fontFamily}"`);
        }
        return false; // Can't check without fonts API
    }

    private handleFontLoadComplete(fontFamily: string, success: boolean, error?: Error): void {
        const fontState = this.fontStates.get(fontFamily);
        if (!fontState) return;

        // Clear timeout if it exists
        if (fontState.timeoutId) {
            clearTimeout(fontState.timeoutId);
            fontState.timeoutId = undefined;
        }

        // Update status
        fontState.status = success ? 'loaded' : 'error';

        // Handle pending elements
        fontState.pendingElements.forEach(({ element, loadingClass, loadedClass }) => {
            if (success) {
                this.domService.removeClass(element, loadingClass);
                this.domService.addClass(element, loadedClass);
                fontState.callbacks?.onElementReady?.(element);
            } else {
                // On error, still remove loading class to prevent infinite loading state
                this.domService.removeClass(element, loadingClass);
            }
        });

        // Clear pending elements
        fontState.pendingElements.clear();

        // Call callbacks
        if (success) {
            fontState.callbacks?.onLoad?.();
            this.loggingService.debug(this.formatMessage(FontLoaderService.MESSAGES.FONT_LOADED_SUCCESS, { fontFamily }));
        } else {
            const finalError = error || new Error(this.formatMessage(FontLoaderService.MESSAGES.FAILED_TO_LOAD, { fontFamily }));
            fontState.callbacks?.onError?.(finalError);
            this.loggingService.error(this.formatMessage(FontLoaderService.MESSAGES.FONT_LOAD_FAILED, { fontFamily }), finalError);
        }
    }

    /**
     * Format message templates with variables
     */
    private formatMessage(template: string, variables: Record<string, string>): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
    }

    /**
     * Clean up resources (useful for tests or when service is destroyed)
     */
    public cleanup(): void {
        for (const [fontFamily, fontState] of this.fontStates.entries()) {
            if (fontState.timeoutId) {
                clearTimeout(fontState.timeoutId);
            }
        }
        this.fontStates.clear();
    }
} 