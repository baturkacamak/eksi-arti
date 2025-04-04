/**
 * Service providing utility methods for page detection and common DOM operations
 */
export class PageUtilsService {
    private static instance: PageUtilsService;

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): PageUtilsService {
        if (!PageUtilsService.instance) {
            PageUtilsService.instance = new PageUtilsService();
        }
        return PageUtilsService.instance;
    }

    /**
     * Check if the current page is an entry list page
     * @returns true if the current page contains an entry list
     */
    public isEntryListPage(): boolean {
        return !!document.querySelector('#entry-item-list') || !!document.querySelector('#topic');
    }

    /**
     * Check if the current page is a user profile page
     * @returns true if the current page is a user profile
     */
    public isUserProfilePage(): boolean {
        return window.location.href.includes('/biri/');
    }

    /**
     * Check if the current page is the trash page
     * @returns true if the current page is the trash page
     */
    public isTrashPage(): boolean {
        return window.location.pathname === '/cop';
    }

    /**
     * Get the current entry ID from the URL or page elements
     * @returns Entry ID or null if not found
     */
    public getCurrentEntryId(): string | null {
        // Try to get from URL first
        const match = window.location.pathname.match(/\/entry\/(\d+)/);
        if (match && match[1]) {
            return match[1];
        }

        // Try to get from the main entry element
        const mainEntry = document.querySelector('article[data-id]');
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
            const authorFromUrl = window.location.pathname.split('/biri/')[1];
            if (authorFromUrl) {
                return decodeURIComponent(authorFromUrl);
            }
        }

        // For entry pages, try to get the author of the main entry
        const authorElement = document.querySelector('.entry-author');
        if (authorElement) {
            return authorElement.textContent?.trim() || null;
        }

        return null;
    }

    /**
     * Check if the page has dark mode enabled
     * @returns true if dark mode is enabled
     */
    public isDarkMode(): boolean {
        // Check for Ekşi's dark mode class on body
        return document.body.classList.contains('dark-theme') ||
            // Or check system preference as fallback
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

// Export the singleton instance
export const pageUtils = PageUtilsService.getInstance();