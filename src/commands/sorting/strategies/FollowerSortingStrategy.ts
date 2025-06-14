import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class FollowerSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'followers';
    public readonly displayName: string = 'Takipçi';
    public readonly icon: string = 'people';
    public readonly tooltip: string = 'Entry\'leri yazarın takipçi sayısına göre sırala';

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const followersA = profileA?.stats?.followerCount || 0;
        const followersB = profileB?.stats?.followerCount || 0;

        return followersB - followersA;
    }
} 