import { ISortingStrategy } from "../ISortingStrategy";
import { IUserProfileService } from "../../../interfaces/services/IUserProfileService";

export class UserLevelSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'user-level';
    public readonly displayName: string = 'Seviye';
    public readonly icon: string = 'star';
    public readonly tooltip: string = 'Entry\'leri yazar seviyesine göre sırala';

    constructor(private userProfileService: IUserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        // Extract the level points directly from rating strings
        const pointsA = this.getLevelPoints(profileA?.stats?.rating);
        const pointsB = this.getLevelPoints(profileB?.stats?.rating);

        // Sort by points in descending order (higher points first)
        return pointsB - pointsA;
    }

    /**
     * Extract numeric level points from rating string
     */
    private getLevelPoints(rankString: string | undefined): number {
        if (!rankString) return 0;

        // Extract the number in parentheses if present
        const match = rankString.match(/\((\d+)\)/);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }

        // If no numeric value is found, return 0
        return 0;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}