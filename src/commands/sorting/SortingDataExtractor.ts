import { IUserProfileService } from "../../interfaces/services/IUserProfileService";
import { IUsernameExtractorService } from "../../interfaces/services/IUsernameExtractorService";

/**
 * Comprehensive data structure for sorting
 * Contains all possible data points that sorting strategies might need
 */
export interface SortingData {
    element: HTMLElement;
    
    // Basic entry data
    id: number;
    favoriteCount: number;
    contentLength: number;
    
    // Author data
    username: string | null;
    
    // User profile data (lazy-loaded)
    profile?: {
        ageInYears: number;
        level: string;
        levelIndex: number;
        levelPoints: number;
        entryCount: number;
        followerCount: number;
        followingCount: number;
        activityRatio: number;
        followingRatio: number;
        engagementRatio: number;
    };
}

/**
 * Service responsible for extracting all sorting-relevant data from HTML elements
 * Centralizes data extraction logic and optimizes performance
 */
export class SortingDataExtractor {
    private readonly levelOrder = ['çaylak', 'yazar', 'büyücü', 'anarşist'];

    constructor(
        private userProfileService: IUserProfileService,
        private usernameExtractorService: IUsernameExtractorService
    ) {}

    /**
     * Extract all sorting data from an HTML element
     * This is called once per element before sorting begins
     */
    public extractSortingData(element: HTMLElement): SortingData {
        const data: SortingData = {
            element,
            id: this.extractId(element),
            favoriteCount: this.extractFavoriteCount(element),
            contentLength: this.extractContentLength(element),
            username: this.usernameExtractorService.extractFromEntry(element),
        };

        // Add profile data if username is available
        if (data.username) {
            const profile = this.userProfileService.getUserProfileFromCache(data.username);
            if (profile) {
                data.profile = this.extractProfileData(profile);
            }
        }

        return data;
    }

    /**
     * Batch extract sorting data for multiple elements
     * Optimized for performance when sorting large lists
     */
    public extractBatch(elements: HTMLElement[]): SortingData[] {
        return elements.map(element => this.extractSortingData(element));
    }

    private extractId(element: HTMLElement): number {
        return parseInt(element.getAttribute("data-id") || "0");
    }

    private extractFavoriteCount(element: HTMLElement): number {
        return parseInt(element.getAttribute("data-favorite-count") || "0");
    }

    private extractContentLength(element: HTMLElement): number {
        const content = element.querySelector(".content");
        if (!content) return 0;
        const whitespaceMatches = content.textContent?.match(/\s+/g);
        return whitespaceMatches ? whitespaceMatches.length : 0;
    }

    private extractProfileData(profile: any) {
        const level = profile.stats?.rating?.replace(/\s*\(\d+\)/, '') || 'çaylak';
        const levelIndex = this.levelOrder.indexOf(level);
        
        return {
            ageInYears: profile.ageInYears || 0,
            level,
            levelIndex: levelIndex !== -1 ? levelIndex : 0,
            levelPoints: profile.stats?.ratingPoints || 0,
            entryCount: profile.stats?.entryCount || 0,
            followerCount: profile.stats?.followerCount || 0,
            followingCount: profile.stats?.followingCount || 0,
            activityRatio: this.calculateActivityRatio(profile),
            followingRatio: this.calculateFollowingRatio(profile),
            engagementRatio: this.calculateEngagementRatio(profile),
        };
    }

    private calculateActivityRatio(profile: any): number {
        if (!profile?.stats?.entryCount || !profile.ageInYears) return 0;
        const entries = profile.stats.entryCount;
        const ageInDays = profile.ageInYears * 365;
        return ageInDays === 0 ? 0 : entries / ageInDays;
    }

    private calculateFollowingRatio(profile: any): number {
        if (!profile?.stats) return 0;
        const followers = profile.stats.followerCount || 0;
        const following = profile.stats.followingCount || 0;
        if (followers === 0) {
            return following > 0 ? Number.MAX_SAFE_INTEGER : 0;
        }
        return following / followers;
    }

    private calculateEngagementRatio(profile: any): number {
        if (!profile?.stats) return 0;
        const followers = profile.stats.followerCount || 0;
        const following = profile.stats.followingCount || 0;
        if (following === 0) {
            return followers > 0 ? Number.MAX_SAFE_INTEGER : 0;
        }
        return followers / following;
    }
} 