import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";

export class FollowerSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'followers';
    public readonly displayName: string = 'Takipçi';
    public readonly icon: string = 'people';
    public readonly tooltip: string = 'Entry\'leri yazarın takipçi sayısına göre sırala';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const followersA = profileA?.stats?.followerCount || 0;
        const followersB = profileB?.stats?.followerCount || 0;

        return followersB - followersA;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
} 