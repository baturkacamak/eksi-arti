import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class EngagementRatioSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'engagement-ratio';
    public readonly displayName: string = 'Etkileşim Oranı';
    public readonly icon: string = 'trending_up';
    public readonly tooltip: string = 'Yazıları yazar etkileşim oranına göre sırala (takipçi/takip edilen)';

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    /**
     * Sort entries by author engagement ratio (follower/following ratio)
     */
    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getCachedUsername(a);
        const authorB = this.getCachedUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const ratioA = this.calculateEngagementRatio(profileA);
        const ratioB = this.calculateEngagementRatio(profileB);

        return ratioB - ratioA; // Descending by default (highest engagement first)
    }

    private calculateEngagementRatio(profile: any): number {
        if (!profile?.stats) return 0;

        const followers = profile.stats.followerCount || 0;
        const following = profile.stats.followingCount || 0;

        // Avoid division by zero
        if (following === 0) {
            return followers > 0 ? Number.MAX_SAFE_INTEGER : 0;
        }

        return followers / following;
    }
} 