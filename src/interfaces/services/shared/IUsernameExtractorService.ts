/**
 * Interface for username extraction service
 * Provides consistent username extraction across the application
 */
export interface IUsernameExtractorService {
    /**
     * Extract username from an entry element
     * Uses URL-based extraction to match cache keys used by UserProfileService
     */
    extractFromEntry(entry: HTMLElement): string | null;

    /**
     * Extract username from an author link element
     * Uses URL-based extraction to match cache keys used by UserProfileService
     */
    extractFromLink(authorLink: HTMLAnchorElement | null): string | null;

    /**
     * Extract username from a URL path
     * Useful for extracting from window.location or other URL strings
     */
    extractFromUrl(url: string): string | null;
} 