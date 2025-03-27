/**
 * AccessibilityService
 * Enhances accessibility in Eksi Sozluk by automatically adding aria-hidden attributes
 * to entry footers and read-more links
 */

import { DOMService } from './dom-service';
import { logDebug, logError, logInfo } from './logging-service';
import { observerService } from './observer-service';
import { pageUtils } from './page-utils-service';

export class AccessibilityService {
    private static instance: AccessibilityService;
    private domHandler: DOMService;
    private initialized: boolean = false;
    private observerId: string = '';

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

            if (!pageUtils.isEntryListPage()) {
                logDebug('No entry list found, skipping accessibility initialization', {}, 'AccessibilityService');
                return;
            }

            // Process existing elements
            this.enhanceAccessibility();

            // Set up observer for new elements
            this.observerId = observerService.observe({
                selector: this.SELECTORS.HIDEABLE_ELEMENTS,
                handler: (elements) => {
                    elements.forEach(element => {
                        if (!element.hasAttribute('aria-hidden')) {
                            element.setAttribute('aria-hidden', 'true');
                        }
                    });

                    // Also observe dropdown menus that might be outside the entry list
                    const dropdownMenus = document.querySelectorAll('.dropdown-menu:not([aria-hidden])');
                    dropdownMenus.forEach(menu => {
                        if (!menu.hasAttribute('aria-hidden')) {
                            menu.setAttribute('aria-hidden', 'true');
                        }
                    });

                    if (elements.length > 0) {
                        logInfo(`Enhanced accessibility for ${elements.length} elements`, {}, 'AccessibilityService');
                    }
                },
                processExisting: false, // We've already processed existing elements above
                root: document.body, // Observe the entire document
                subtree: true
            });

            this.initialized = true;
            logDebug('Accessibility service initialized', {}, 'AccessibilityService');
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
     * Clean up resources
     */
    public dispose(): void {
        if (this.observerId) {
            observerService.unobserve(this.observerId);
        }
        this.initialized = false;
        logDebug('Accessibility service disposed', {}, 'AccessibilityService');
    }
}

// Export singleton instance
export const accessibilityService = AccessibilityService.getInstance();