import { ISortingStrategy } from "../ISortingStrategy";
import { UserProfileService } from "../../../services/user-profile-service";

export class TotalEntriesSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'total-entries';
    public readonly displayName: string = 'Entry Sayısı';
    public readonly icon: string = 'description';
    public readonly tooltip: string = 'Entry\'leri yazarın toplam entry sayısına göre sırala';

    constructor(private userProfileService: UserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const entriesA = this.userProfileService.getUserProfileFromCache(authorA)?.entryCount || 0;
        const entriesB = this.userProfileService.getUserProfileFromCache(authorB)?.entryCount || 0;

        return entriesB - entriesA;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}
