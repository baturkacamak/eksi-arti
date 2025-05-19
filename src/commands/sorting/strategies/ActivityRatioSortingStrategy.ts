import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";

export class ActivityRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'activity-ratio';
    public readonly displayName: string = 'Aktivite Oranı';
    public readonly icon: string = 'trending_up';
    public readonly tooltip: string = 'Entry\'leri yazarın aktivite oranına göre sırala (entry/gün)';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const ratioA = this.getActivityRatio(authorA);
        const ratioB = this.getActivityRatio(authorB);

        return ratioB - ratioA;
    }

    private getActivityRatio(username: string): number {
        const profile = this.userProfileService.getUserProfileFromCache(username);
        if (!profile) return 0;

        const entries = profile.stats?.entryCount || 0;
        const ageInDays = (profile.ageInYears || 0) * 365;

        // Avoid division by zero
        if (ageInDays === 0) return 0;

        return entries / ageInDays;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
} 