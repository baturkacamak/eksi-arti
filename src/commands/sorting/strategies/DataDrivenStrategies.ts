import { DataDrivenSortingStrategy } from "../DataDrivenSortingStrategy";
import { SortingData } from "../SortingDataExtractor";
import { ISortingStrategy } from "../ISortingStrategy";

/**
 * Data-driven sorting strategies that work with pre-extracted data
 * These are much cleaner and more performant than DOM-based strategies
 */

export class DateDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = "date";
    readonly icon = "access_time";
    readonly tooltip = "Tarihe göre sırala (varsayılan)";

    protected compare(a: SortingData, b: SortingData): number {
        return b.id - a.id; // Descending by default (newer first)
    }
}

export class FavoriteCountDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = "favorite";
    readonly icon = "favorite";
    readonly tooltip = "Favori sayısına göre sırala";

    protected compare(a: SortingData, b: SortingData): number {
        return b.favoriteCount - a.favoriteCount; // Descending by default (most favorites first)
    }
}

export class LengthDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = "length";
    readonly icon = "format_line_spacing";
    readonly tooltip = "Uzunluğa göre sırala";

    protected compare(a: SortingData, b: SortingData): number {
        return b.contentLength - a.contentLength; // Descending by default (longest first)
    }
}

export class TotalEntriesDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'total-entries';
            readonly displayName = 'Yazı Sayısı';
    readonly icon = 'format_list_numbered';
            readonly tooltip = 'Yazıları yazarın toplam yazı sayısına göre sırala';

    protected compare(a: SortingData, b: SortingData): number {
        const entriesA = a.profile?.entryCount || 0;
        const entriesB = b.profile?.entryCount || 0;
        return entriesB - entriesA; // Descending by default (most entries first)
    }
}

export class UserLevelDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'user-level';
    readonly displayName = 'Kullanıcı Seviyesi';
    readonly icon = 'star';
            readonly tooltip = 'Yazıları yazarın seviye puanına göre sırala';

    protected compare(a: SortingData, b: SortingData): number {
        const levelA = a.profile?.levelIndex || 0;
        const levelB = b.profile?.levelIndex || 0;
        const pointsA = a.profile?.levelPoints || 0;
        const pointsB = b.profile?.levelPoints || 0;

        // First sort by level order
        const levelComparison = levelB - levelA;
        if (levelComparison !== 0) {
            return levelComparison; // Descending by default (higher level first)
        }

        // If same level, sort by points
        return pointsB - pointsA; // Descending by default (higher points first)
    }
}

export class AccountAgeDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'account-age';
    readonly displayName = 'Hesap Yaşı';
    readonly icon = 'account_circle';
            readonly tooltip = 'Yazıları yazar hesap yaşına göre sırala';

    protected compare(a: SortingData, b: SortingData): number {
        const ageA = a.profile?.ageInYears || 0;
        const ageB = b.profile?.ageInYears || 0;
        const usernameA = a.username || '';
        const usernameB = b.username || '';

        // Handle missing profiles
        if (!a.profile && !b.profile) return 0;
        if (!a.profile) return 1;
        if (!b.profile) return -1;

        // Sort by age descending (older accounts first)
        if (ageA !== ageB) {
            return ageB - ageA; // Descending by default (older first)
        }

        // If ages are the same, sort by username for stable sorting
        return usernameA.localeCompare(usernameB);
    }
}

export class FollowerDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'followers';
    readonly displayName = 'Takipçi';
    readonly icon = 'people';
            readonly tooltip = 'Yazıları yazarın takipçi sayısına göre sırala';

    protected compare(a: SortingData, b: SortingData): number {
        const followersA = a.profile?.followerCount || 0;
        const followersB = b.profile?.followerCount || 0;
        return followersB - followersA; // Descending by default (most followers first)
    }
}

export class ActivityRatioDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'activity-ratio';
    readonly displayName = 'Aktivite Oranı';
    readonly icon = 'speed';
            readonly tooltip = 'Yazıları yazarın günlük yazı oranına göre sırala';

    protected compare(a: SortingData, b: SortingData): number {
        const ratioA = a.profile?.activityRatio || 0;
        const ratioB = b.profile?.activityRatio || 0;
        return ratioB - ratioA; // Descending by default (most active first)
    }
}

export class FollowingRatioDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'following-ratio';
    readonly displayName = 'Takip Oranı';
    readonly icon = 'group_add';
            readonly tooltip = 'Yazıları yazarın takip oranına göre sırala (takip edilen/takipçi)';

    protected compare(a: SortingData, b: SortingData): number {
        const ratioA = a.profile?.followingRatio || 0;
        const ratioB = b.profile?.followingRatio || 0;
        return ratioB - ratioA; // Descending by default (highest ratio first)
    }
}

export class EngagementRatioDataStrategy extends DataDrivenSortingStrategy implements ISortingStrategy {
    readonly name = 'engagement-ratio';
    readonly displayName = 'Etkileşim Oranı';
    readonly icon = 'trending_up';
            readonly tooltip = 'Yazıları yazar etkileşim oranına göre sırala (takipçi/takip edilen)';

    protected compare(a: SortingData, b: SortingData): number {
        const ratioA = a.profile?.engagementRatio || 0;
        const ratioB = b.profile?.engagementRatio || 0;
        return ratioB - ratioA; // Descending by default (highest engagement first)
    }
} 