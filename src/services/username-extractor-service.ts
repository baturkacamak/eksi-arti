import { IUsernameExtractorService } from "../interfaces/services/IUsernameExtractorService";

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
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return this.extractFromLink(authorLink);
    }

    /**
     * Extract username from an author link element
     * Uses URL-based extraction to match cache keys used by UserProfileService
     */
    public extractFromLink(authorLink: HTMLAnchorElement | null): string | null {
        if (!authorLink) return null;
        
        const href = authorLink.getAttribute('href');
        if (!href || !href.includes('/biri/')) return null;
        
        return href.split('/biri/')[1] || null;
    }

    /**
     * Extract username from a URL path
     * Useful for extracting from window.location or other URL strings
     */
    public extractFromUrl(url: string): string | null {
        if (!url.includes('/biri/')) return null;
        return url.split('/biri/')[1] || null;
    }
} 