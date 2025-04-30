import { ISortingStrategy } from "../ISortingStrategy";
import {IUserProfile, UserProfileService} from "../../../services/user-profile-service";
import {IUserProfileService} from "../../../interfaces/services/IUserProfileService";

export class TotalEntriesSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'total-entries';
    public readonly displayName: string = 'Entry Sayısı';
    public readonly icon: string = 'description';
    public readonly tooltip: string = 'Entry\'leri yazarın toplam entry sayısına göre sırala';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const entriesA = profileA?.stats?.entryCount || 0;
        const entriesB = profileB?.stats?.entryCount || 0;

        return entriesB - entriesA;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}