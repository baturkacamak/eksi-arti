/**
 * AccessibilityService
 * Enhances accessibility in Eksi Sozluk by automatically adding aria-hidden attributes
 * to entry footers and read-more links
 */

import { DOMService } from './dom-service';
import { logDebug, logError, logInfo } from './logging-service';

export class AccessibilityService {
    private static instance: AccessibilityService;
    private domHandler: DOMService;
    private observer: MutationObserver | null = null;
    private initialized: boolean = false;

    private readonly SELECTORS = {
        ENTRY_LIST: '#entry-item-list',
        HIDEABLE_ELEMENTS: 'footer, .read-more-link-wrapper, .dropdown-menu'
    };

    private constructor() {
        this.domHandler = new DOMService();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AccessibilityService {
        if (!AccessibilityService.instance) {
            AccessibilityService.instance = new AccessibilityService();
        }
        return AccessibilityService.instance;
    }

    /**
     * Initialize the accessibility service
     */
    public initialize(): void {
        try {
            if (this.initialized) {
                return;
            }

            const entryList = document.querySelector(this.SELECTORS.ENTRY_LIST);
            if (entryList) {
                this.enhanceAccessibility();
                this.setupMutationObserver();
                this.initialized = true;
                logDebug('Accessibility service initialized', {}, 'AccessibilityService');
            } else {
                logDebug('No entry list found, skipping accessibility initialization', {}, 'AccessibilityService');
            }
        } catch (error) {
            logError('Error initializing accessibility service', error, 'AccessibilityService');
        }
    }

    /**
     * Enhance accessibility by adding aria-hidden attributes
     */
    private enhanceAccessibility(): void {
        try {
            const entryList = document.querySelector(this.SELECTORS.ENTRY_LIST);
            if (!entryList) return;

            // Process entry list elements
            const hideableElements = entryList.querySelectorAll(this.SELECTORS.HIDEABLE_ELEMENTS);
            hideableElements.forEach((element) => {
                if (!element.hasAttribute('aria-hidden')) {
                    element.setAttribute('aria-hidden', 'true');
                }
            });

            // Also process any dropdown menus in the entire document
            // These are typically outside the entry list but should still be accessible
            const dropdownMenus = document.querySelectorAll('.dropdown-menu:not([aria-hidden])');
            dropdownMenus.forEach((element) => {
                // Only add aria-hidden if it doesn't already have it
                if (!element.hasAttribute('aria-hidden')) {
                    element.setAttribute('aria-hidden', 'true');
                }
            });

            const totalEnhanced = hideableElements.length + dropdownMenus.length;
            logInfo(`Enhanced accessibility for ${totalEnhanced} elements`, {}, 'AccessibilityService');
        } catch (error) {
            logError('Error enhancing accessibility', error, 'AccessibilityService');
        }
    }

    /**
     * Set up mutation observer to enhance accessibility for dynamically added elements
     */
    private setupMutationObserver(): void {
        try {
            // Disconnect existing observer if any
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }

            // Create new observer
            this.observer = new MutationObserver((mutations) => {
                const hasRelevantChanges = mutations.some(({ addedNodes, removedNodes }) =>
                    addedNodes.length || removedNodes.length
                );

                if (hasRelevantChanges && document.querySelector(this.SELECTORS.ENTRY_LIST)) {
                    this.enhanceAccessibility();
                }
            });

            // Start observing
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            logDebug('Mutation observer set up for accessibility enhancements', {}, 'AccessibilityService');
        } catch (error) {
            logError('Error setting up mutation observer', error, 'AccessibilityService');
        }
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.initialized = false;
        logDebug('Accessibility service disposed', {}, 'AccessibilityService');
    }
}

// Export singleton instance
export const accessibilityService = AccessibilityService.getInstance();