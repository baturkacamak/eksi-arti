import { IUsernameExtractorService } from "../../interfaces/services/shared/IUsernameExtractorService";
import { UsernameExtractorService } from "./username-extractor-service";
import { SELECTORS, PATHS } from "../../constants";
import { IDOMService } from "../../interfaces/services/shared/IDOMService";

/**
 * Service providing utility methods for page detection and common DOM operations
 */
export class PageUtilsService {
    private static instance: PageUtilsService;

    private constructor(
        private usernameExtractorService: IUsernameExtractorService,
        private domService: IDOMService
    ) {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(usernameExtractorService: IUsernameExtractorService, domService: IDOMService): PageUtilsService {
        if (!PageUtilsService.instance) {
            PageUtilsService.instance = new PageUtilsService(usernameExtractorService, domService);
        }
        return PageUtilsService.instance;
    }

    /**
     * Check if the current page is an entry list page
     * @returns true if the current page contains an entry list
     */
    public isEntryListPage(): boolean {
        return !!this.domService.querySelector(SELECTORS.ENTRY_ITEM_LIST) || !!this.domService.querySelector(SELECTORS.TOPIC);
    }

    /**
     * Check if the current page is a user profile page
     * @returns true if the current page is a user profile
     */
    public isUserProfilePage(): boolean {
        return window.location.href.includes(PATHS.BIRI);
    }

    /**
     * Check if the current page is the trash page
     * @returns true if the current page is the trash page
     */
    public isTrashPage(): boolean {
        return window.location.pathname === PATHS.COP;
    }

    /**
     * Get the current entry ID from the URL or page elements
     * @returns Entry ID or null if not found
     */
    public getCurrentEntryId(): string | null {
        // Try to get from URL first
        const entryPattern = new RegExp(`${PATHS.ENTRY}(\\d+)`);
        const match = window.location.pathname.match(entryPattern);
        if (match && match[1]) {
            return match[1];
        }

        // Try to get from the main entry element
        const mainEntry = this.domService.querySelector('article[data-id]');
        if (mainEntry) {
            return mainEntry.getAttribute('data-id');
        }

        return null;
    }

    /**
     * Get the current author from the page
     * @returns Author username or null if not found
     */
    public getCurrentAuthor(): string | null {
        // For profile pages
        if (this.isUserProfilePage()) {
            const authorFromUrl = this.usernameExtractorService.extractFromUrl(window.location.pathname);
            if (authorFromUrl) {
                return decodeURIComponent(authorFromUrl);
            }
        }

        // For entry pages, try to get the author of the main entry
        const authorElement = this.domService.querySelector<HTMLAnchorElement>(SELECTORS.ENTRY_AUTHOR);
        if (authorElement) {
            return this.usernameExtractorService.extractFromLink(authorElement);
        }

        return null;
    }

    /**
     * @deprecated Use DocumentStateService.isDarkMode() instead
     * Check if the page has dark mode enabled
     * @returns true if dark mode is enabled
     */
    public isDarkMode(): boolean {
        // Check for Ekşi's dark mode class on body
        const body = this.domService.querySelector('body');
        return (body?.classList.contains('dark-theme')) ||
            // Or check system preference as fallback
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    /**
     * Check if entry-related features (search, sorting) should be initialized
     * Features should only appear on thread pages (not profile pages) with sufficient entries
     * @param minEntryCount Minimum number of entries required (default: 5)
     * @returns true if features should be initialized
     */
    public shouldInitializeEntryFeatures(minEntryCount: number = 5): boolean {
        // Only initialize on entry list pages (thread pages), but not on profile pages
        const isEntryListPage = this.isEntryListPage();
        const isProfilePage = this.isUserProfilePage();
        
        if (!isEntryListPage || isProfilePage) {
            return false;
        }
        
        // Check if there are enough entries to make features worthwhile
        const entries = this.domService.querySelectorAll('#entry-item-list li[data-id], #topic li[data-id]');
        const entryCount = entries.length;
        
        return entryCount >= minEntryCount;
    }
}

// Export factory function for DI container
export function createPageUtilsService(usernameExtractorService: IUsernameExtractorService, domService: IDOMService): PageUtilsService {
    return PageUtilsService.getInstance(usernameExtractorService, domService);
}

// Export compatibility singleton for existing code (will need DOMService)
import { DOMService } from "./dom-service";
export const pageUtils = PageUtilsService.getInstance(UsernameExtractorService.createSimple(), new DOMService());