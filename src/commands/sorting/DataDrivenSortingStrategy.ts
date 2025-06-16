import { SortingData } from "./SortingDataExtractor";

/**
 * Abstract base class for data-driven sorting strategies
 * Strategies work with pre-extracted data instead of DOM elements
 */
export abstract class DataDrivenSortingStrategy {
    abstract readonly name: string;
    abstract readonly icon: string;
    abstract readonly tooltip: string;
    
    readonly displayName?: string;
    readonly defaultDirection: 'asc' | 'desc' = 'desc';

    /**
     * Template method that handles direction logic for data-driven strategies
     */
    public sortData(a: SortingData, b: SortingData, direction: 'asc' | 'desc' = 'desc'): number {
        const result = this.compare(a, b);
        return direction === 'asc' ? -result : result;
    }

    /**
     * Abstract method that concrete strategies must implement
     * Works with pre-extracted data instead of DOM elements
     */
    protected abstract compare(a: SortingData, b: SortingData): number;
}

// Example implementations would be much simpler:

export class DateSortingDataStrategy extends DataDrivenSortingStrategy {
    readonly name = "date";
    readonly icon = "access_time";
    readonly tooltip = "Tarihe göre sırala (varsayılan)";

    protected compare(a: SortingData, b: SortingData): number {
        return b.id - a.id; // Clean and simple!
    }
}

export class FavoriteCountDataStrategy extends DataDrivenSortingStrategy {
    readonly name = "favorite";
    readonly icon = "favorite";
    readonly tooltip = "Favori sayısına göre sırala";

    protected compare(a: SortingData, b: SortingData): number {
        return b.favoriteCount - a.favoriteCount; // No DOM queries!
    }
}

export class FollowerCountDataStrategy extends DataDrivenSortingStrategy {
    readonly name = "followers";
    readonly displayName = "Takipçi";
    readonly icon = "people";
    readonly tooltip = "Yazıları yazarın takipçi sayısına göre sırala";

    protected compare(a: SortingData, b: SortingData): number {
        const followersA = a.profile?.followerCount || 0;
        const followersB = b.profile?.followerCount || 0;
        return followersB - followersA; // Super clean!
    }
} 