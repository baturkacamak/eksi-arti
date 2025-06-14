import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class ActivityRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'activity-ratio';
    public readonly displayName: string = 'Aktivite Oranı';
    public readonly icon: string = 'speed';
    public readonly tooltip: string = 'Entry\'leri yazarın günlük entry oranına göre sırala';

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    /**
     * Sort entries by author activity ratio (entries per day since registration)
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const ratioA = this.calculateActivityRatio(profileA);
        const ratioB = this.calculateActivityRatio(profileB);

        return ratioB - ratioA; // Descending order
    }

    private calculateActivityRatio(profile: any): number {
        if (!profile?.stats?.entryCount || !profile.ageInYears) return 0;

        const entries = profile.stats.entryCount;
        const ageInDays = (profile.ageInYears || 0) * 365;

        if (ageInDays === 0) return 0;

        return entries / ageInDays;
    }
} 