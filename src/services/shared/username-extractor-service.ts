import { IUsernameExtractorService } from "../../interfaces/services/shared/IUsernameExtractorService";
import { SELECTORS, PATHS } from "../../constants";

/**
 * Service for extracting usernames from entry elements
 * Provides consistent username extraction across the application
 */
export class UsernameExtractorService implements IUsernameExtractorService {
    /**
     * Extract username from an entry element
     * Uses URL-based extraction to match cache keys used by UserProfileService
     */
    public extractFromEntry(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>(SELECTORS.ENTRY_AUTHOR);
        return this.extractFromLink(authorLink);
    }

    /**
     * Extract username from an author link element
     * Uses URL-based extraction to match cache keys used by UserProfileService
     */
    public extractFromLink(authorLink: HTMLAnchorElement | null): string | null {
        if (!authorLink) return null;
        
        const href = authorLink.getAttribute('href');
        return this.extractFromHref(href);
    }

    /**
     * Extract username from a URL path
     * Useful for extracting from window.location or other URL strings
     */
    public extractFromUrl(url: string): string | null {
        return this.extractFromHref(url);
    }

    /**
     * Common logic for extracting username from href or URL
     * @private
     */
    private extractFromHref(href: string | null): string | null {
        if (!href || !href.includes(PATHS.BIRI)) {
            return null;
        }
        
        const parts = href.split(PATHS.BIRI);
        return parts[1] || null;
    }

    /**
     * Static method for creating a simple instance without DI
     * Used for compatibility scenarios
     */
    public static createSimple(): UsernameExtractorService {
        return new UsernameExtractorService();
    }
} 