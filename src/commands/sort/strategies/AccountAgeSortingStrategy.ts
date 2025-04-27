// src/commands/sort/strategies/AccountAgeSortingStrategy.ts
import { ISortingStrategy } from "../ISortingStrategy";
import { UserProfileService } from "../../../services/user-profile-service";

export class AccountAgeSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'account-age';
    public readonly displayName: string = 'Hesap Yaşı';
    public readonly icon: string = 'account_circle';
    public readonly tooltip: string = 'Entry\'leri yazar hesap yaşına göre sırala';

    constructor(private userProfileService: UserProfileService) {}

    /**
     * Sort entries by author account age
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        // Get account ages from cache or default to 0
        const ageA = this.userProfileService.getUserProfileFromCache(authorA)?.ageInYears || 0;
        const ageB = this.userProfileService.getUserProfileFromCache(authorB)?.ageInYears || 0;

        // Sort in descending order (older accounts first)
        return ageB - ageA;
    }

    /**
     * Extract author username from entry element
     */
    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector('.entry-author');
        if (authorLink) {
            return authorLink.textContent?.trim() || null;
        }
        return null;
    }

    /**
     * Preload account ages for all entries before sorting
     */
    public async preloadAccountAges(entries: HTMLElement[]): Promise<void> {
        const usernames = entries
            .map(entry => this.getAuthorUsername(entry))
            .filter((username): username is string => username !== null);

        // Create a unique set of usernames
        const uniqueUsernames = Array.from(new Set(usernames));

        // Preload account ages for all unique usernames
        await Promise.all(
            uniqueUsernames.map(username =>
                this.userProfileService.getUserProfile(username)
            )
        );
    }
}