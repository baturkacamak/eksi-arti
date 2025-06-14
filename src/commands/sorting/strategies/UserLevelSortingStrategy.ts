import { BaseUserProfileSortingStrategy } from "../BaseUserProfileSortingStrategy";
import { IUserProfileService } from "../../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../../interfaces/services/IUsernameExtractorService";

export class UserLevelSortingStrategy extends BaseUserProfileSortingStrategy {
    public readonly name: string = 'user-level';
    public readonly displayName: string = 'Kullanıcı Seviyesi';
    public readonly icon: string = 'star';
    public readonly tooltip: string = 'Entry\'leri yazarın seviye puanına göre sırala';

    // Define level order (higher index = higher level)
    private readonly levelOrder = [
        'çaylak',
        'yazar',
        'büyücü',
        'anarşist'
    ];

    constructor(
        userProfileService: IUserProfileService,
        usernameExtractorService: IUsernameExtractorService
    ) {
        super(userProfileService, usernameExtractorService);
    }

    protected compare(a: HTMLElement, b: HTMLElement): number {
        const authorA = this.usernameExtractorService.extractFromEntry(a);
        const authorB = this.usernameExtractorService.extractFromEntry(b);

        if (!authorA || !authorB) return 0;

        const profileA = this.userProfileService.getUserProfileFromCache(authorA);
        const profileB = this.userProfileService.getUserProfileFromCache(authorB);

        const levelA = this.getUserLevel(profileA);
        const levelB = this.getUserLevel(profileB);

        // First sort by level order
        const levelComparison = levelB.levelIndex - levelA.levelIndex;
        if (levelComparison !== 0) {
            return levelComparison; // Descending by default (higher level first)
        }

        // If same level, sort by points
        return levelB.points - levelA.points; // Descending by default (higher points first)
    }

    private getUserLevel(profile: any): { levelIndex: number, points: number } {
        if (!profile?.stats?.rating) {
            return { levelIndex: -1, points: 0 };
        }

        const rating = profile.stats.rating.toLowerCase();
        const points = profile.stats.ratingPoints || 0;

        // Find the level in our order
        for (let i = this.levelOrder.length - 1; i >= 0; i--) {
            if (rating.includes(this.levelOrder[i])) {
                return { levelIndex: i, points };
            }
        }

        return { levelIndex: -1, points };
    }
} 