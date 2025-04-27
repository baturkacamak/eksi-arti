import { ISortingStrategy } from "../ISortingStrategy";
import { UserProfileService } from "../../../services/user-profile-service";

export class FollowerSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'followers';
    public readonly displayName: string = 'Takipçi';
    public readonly icon: string = 'people';
    public readonly tooltip: string = 'Entry\'leri yazarın takipçi sayısına göre sırala';

    constructor(private userProfileService: UserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const followersA = this.userProfileService.getUserProfileFromCache(authorA)?.followerCount || 0;
        const followersB = this.userProfileService.getUserProfileFromCache(authorB)?.followerCount || 0;

        return followersB - followersA;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}
