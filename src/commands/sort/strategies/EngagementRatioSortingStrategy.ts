import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";

export class EngagementRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'engagement-ratio';
    public readonly displayName: string = 'Etkileşim Oranı';
    public readonly icon: string = 'insights';
    public readonly tooltip: string = 'Entry\'leri yazarın etkileşim oranına göre sırala (takipçi/entry)';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const ratioA = this.getEngagementRatio(authorA);
        const ratioB = this.getEngagementRatio(authorB);

        return ratioB - ratioA;
    }

    private getEngagementRatio(username: string): number {
        const profile = this.userProfileService.getUserProfileFromCache(username);
        if (!profile) return 0;

        const followers = profile.stats?.followerCount || 0;
        const entries = profile.stats?.entryCount || 0;

        // Avoid division by zero
        if (entries === 0) return 0;

        return followers / entries;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}