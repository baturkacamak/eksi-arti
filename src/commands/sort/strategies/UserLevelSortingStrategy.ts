import { ISortingStrategy } from "../ISortingStrategy";
import { UserProfileService } from "../../../services/user-profile-service";

export class UserLevelSortingStrategy implements ISortingStrategy {
    public readonly name: string = 'user-level';
    public readonly displayName: string = 'Seviye';
    public readonly icon: string = 'star';
    public readonly tooltip: string = 'Entry\'leri yazar seviyesine göre sırala';

    private levelOrder = {
        'çaylak': 1,
        'yazar': 2,
        'deneme yazarı': 3,
        'gümüş heykelcik': 4,
        'altın heykelcik': 5,
        'elmas heykelcik': 6,
        'platin heykelcik': 7,
        'usta': 8,
        'aşık': 9,
        'filozof': 10,
        'efsane': 11,
        'anarşist': 12,
        'veteran': 13,
        'meczup': 14,
        'hayyam': 15
        // Add more levels as needed
    };

    constructor(private userProfileService: UserProfileService) {}

    public sort(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.getAuthorUsername(a);
        const authorB = this.getAuthorUsername(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const levelA = this.getUserLevelScore(profileA?.rank);
        const levelB = this.getUserLevelScore(profileB?.rank);

        // If levels are the same, use level points as tiebreaker
        if (levelA === levelB) {
            const pointsA = this.getLevelPoints(profileA?.rank);
            const pointsB = this.getLevelPoints(profileB?.rank);
            return pointsB - pointsA;
        }

        return levelB - levelA; // Descending: higher levels first
    }

    private getUserLevelScore(rankString: string | undefined): number {
        if (!rankString) return 0;

        // Extract the level name from "anarşist (229)" format
        const levelMatch = rankString.match(/^([^(]+)(?:\s*\((\d+)\))?$/);
        if (!levelMatch) return 0;

        const levelName = levelMatch[1].trim().toLowerCase();
        return this.levelOrder[levelName] || 0;
    }

    private getLevelPoints(rankString: string | undefined): number {
        if (!rankString) return 0;

        const levelMatch = rankString.match(/^[^(]+\((\d+)\)$/);
        return levelMatch ? parseInt(levelMatch[1], 10) : 0;
    }

    private getAuthorUsername(entry: HTMLElement): string | null {
        const authorLink = entry.querySelector<HTMLAnchorElement>('.entry-author');
        return authorLink?.textContent?.trim() || null;
    }
}