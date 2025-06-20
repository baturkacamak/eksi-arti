import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from '../../../interfaces/services/features/user/IUserProfileService';
import { IUsernameExtractorService } from '../../../interfaces/services/shared/IUsernameExtractorService';

export class ActivityRatioSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'activity-ratio';
    public readonly displayName: string = 'Aktivite Oranı';
    public readonly icon: string = 'speed';
    public readonly tooltip: string = 'Yazıları yazarın günlük yazı oranına göre sırala';

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    /**
     * Sort entries by author activity ratio (entries per day since registration)
     */
    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getCachedUsername(a);
        const authorB = this.getCachedUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const ratioA = this.calculateActivityRatio(profileA);
        const ratioB = this.calculateActivityRatio(profileB);

        return ratioB - ratioA; // Descending by default (most active first)
    }

    private calculateActivityRatio(profile: any): number {
        if (!profile?.stats?.entryCount || !profile.ageInYears) return 0;

        const entries = profile.stats.entryCount;
        const ageInDays = (profile.ageInYears || 0) * 365;

        if (ageInDays === 0) return 0;

        return entries / ageInDays;
    }
} 