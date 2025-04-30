import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";

export class FollowingRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'following-ratio';
    public readonly displayName: string = 'Takip Oranı';
    public readonly icon: string = 'compare_arrows';
    public readonly tooltip: string = 'Entry\'leri yazarın takipçi/takip oranına göre sırala';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const ratioA = this.getFollowingRatio(authorA);
        const ratioB = this.getFollowingRatio(authorB);

        return ratioB - ratioA;
    }

    private getFollowingRatio(username: string): number {
        const profile = this.userProfileService.getUserProfileFromCache(username);
        if (!profile) return 0;

        const followers = profile.stats?.followerCount || 0;
        const following = profile.stats?.followingCount || 0;

        // Avoid division by zero
        if (following === 0) return followers > 0 ? 1000 : 0;

        return followers / following;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}