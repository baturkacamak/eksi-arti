import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { UsernameExtractor } from "../../../utils/username-extractor";

export class EngagementRatioSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'engagement-ratio';
    public readonly displayName: string = 'Etkileşim Oranı';
    public readonly icon: string = 'trending_up';
    public readonly tooltip: string = 'Entry\'leri yazar etkileşim oranına göre sırala (takipçi/takip edilen)';

    constructor(private userProfileService: IUserProfileService) {}

    /**
     * Sort entries by author engagement ratio (follower/following ratio)
     */
    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = UsernameExtractor.extractFromEntry(a);
        const authorB = UsernameExtractor.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const ratioA = this.calculateEngagementRatio(profileA);
        const ratioB = this.calculateEngagementRatio(profileB);

        return ratioB - ratioA; // Descending order
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