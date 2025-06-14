import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class AccountAgeSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'account-age';
    public readonly displayName: string = 'Hesap Yaşı';
    public readonly icon: string = 'account_circle';
    public readonly tooltip: string = 'Entry\'leri yazar hesap yaşına göre sırala';

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    /**
     * Sort entries by author account age (using only cached data)
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

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
            return ageB - ageA;
        }

        // If ages are the same, sort by username for stable sorting
        return authorA.localeCompare(authorB);
    }
} 