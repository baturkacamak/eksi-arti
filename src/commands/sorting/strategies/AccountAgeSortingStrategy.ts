import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from '../../../interfaces/services/features/user/IUserProfileService';
import { IUsernameExtractorService } from '../../../interfaces/services/shared/IUsernameExtractorService';

export class AccountAgeSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'account-age';
    public readonly displayName: string = 'Hesap Yaşı';
    public readonly icon: string = 'account_circle';
    public readonly tooltip: string = 'Yazıları yazar hesap yaşına göre sırala';

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    /**
     * Sort entries by author account age (using only cached data)
     */
    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getCachedUsername(a);
        const authorB = this.getCachedUsername(b);

        if (!authorA || !authorB) {
            return 0;
        }

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        // If one profile is missing, sort it to the end
        if (!profileA && !profileB) {
            return 0; // Both missing, keep original order
        }
        if (!profileA) {
            return 1; // A missing, B should come first
        }
        if (!profileB) {
            return -1; // B missing, A should come first
        }

        const ageA = profileA.ageInYears;
        const ageB = profileB.ageInYears;

        // Sort by age descending (older accounts first)
        if (ageA !== ageB) {
            return ageB - ageA; // Descending by default (older first)
        }

        // If ages are the same, sort by username for stable sorting
        return authorA.localeCompare(authorB);
    }
} 