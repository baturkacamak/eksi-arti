import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class FollowingRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'following-ratio';
    public readonly displayName: string = 'Takip Oranı';
    public readonly icon: string = 'group_add';
    public readonly tooltip: string = 'Entry\'leri yazarın takip oranına göre sırala (takip edilen/takipçi)';

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    /**
     * Sort entries by author following ratio (following/follower ratio)
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const ratioA = this.calculateFollowingRatio(profileA);
        const ratioB = this.calculateFollowingRatio(profileB);

        return ratioB - ratioA; // Descending order
    }

    private calculateFollowingRatio(profile: any): number {
        if (!profile?.stats) return 0;

        const followers = profile.stats.followerCount || 0;
        const following = profile.stats.followingCount || 0;

        // Avoid division by zero
        if (followers === 0) {
            return following > 0 ? Number.MAX_SAFE_INTEGER : 0;
        }

        return following / followers;
    }
} 