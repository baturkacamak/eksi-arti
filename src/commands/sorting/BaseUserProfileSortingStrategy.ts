import { BaseSortingStrategy } from "./BaseSortingStrategy";
import { IUserProfileService } from "../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";

/**
 * Abstract base class for sorting strategies that require user profile services
 * Includes performance optimization by caching username extractions during sorting
 */
export abstract class BaseUserProfileSortingStrategy extends BaseSortingStrategy {
    private usernameCache = new WeakMap<HTMLElement, string | null>();

    constructor(
        protected userProfileService: IUserProfileService,
        protected usernameExtractorService: IUsernameExtractorService
    ) {
        super();
    }

    /**
     * Override the sort method to clear cache before sorting
     * and pre-cache usernames for better performance
     */
    public sort(a: HTMLElement, b: HTMLElement, direction: 'asc' | 'desc' = 'desc'): number {
        // Clear cache for this sorting operation
        this.usernameCache = new WeakMap<HTMLElement, string | null>();
        
        return super.sort(a, b, direction);
    }

    /**
     * Get cached username or extract and cache it
     * This avoids repeated DOM queries during sorting
     */
    protected getCachedUsername(entry: HTMLElement): string | null {
        if (this.usernameCache.has(entry)) {
            return this.usernameCache.get(entry)!;
        }

        const username = this.usernameExtractorService.extractFromEntry(entry);
        this.usernameCache.set(entry, username);
        return username;
    }

    /**
     * Pre-cache usernames for all entries to optimize sorting performance
     * Should be called before sorting large lists
     */
    public preCacheUsernames(entries: HTMLElement[]): void {
        this.usernameCache = new WeakMap<HTMLElement, string | null>();
        
        for (const entry of entries) {
            if (!this.usernameCache.has(entry)) {
                const username = this.usernameExtractorService.extractFromEntry(entry);
                this.usernameCache.set(entry, username);
            }
        }
    }
} 