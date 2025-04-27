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
     * Sort entries by author account age (using only cached data)
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const ageA = this.userProfileService.getUserProfileFromCache(authorA)?.ageInYears || 0;
        const ageB = this.userProfileService.getUserProfileFromCache(authorB)?.ageInYears || 0;

        return ageB - ageA; // Descending: older accounts first
    }

    /**
     * Extract author username from entry element
     */
    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}