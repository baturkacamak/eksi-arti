import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class FollowerSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'followers';
    public readonly displayName: string = 'Takipçi';
    public readonly icon: string = 'people';
    public readonly tooltip: string = 'Yazıları yazarın takipçi sayısına göre sırala';

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getCachedUsername(a);
        const authorB = this.getCachedUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const followersA = profileA?.stats?.followerCount || 0;
        const followersB = profileB?.stats?.followerCount || 0;

        return followersB - followersA; // Descending by default (most followers first)
    }
} 