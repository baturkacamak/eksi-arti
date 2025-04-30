/**
 * Represents a user profile with basic information and statistics
 */
export interface IUserProfile {
    /**
     * Username of the user
     */
    username: string;

    /**
     * Registration date as Unix timestamp
     */
    registrationDate: number;

    /**
     * Account age in years
     */
    ageInYears: number;

    /**
     * Account age in months
     */
    ageInMonths: number;

    /**
     * Last time profile was updated
     */
    lastUpdated: number;

    /**
     * User statistics and metrics
     */
    stats?: {
        /**
         * User level/rank (e.g., "çaylak", "yazar", "anarşist (229)")
         */
        rating?: string;

        /**
         * Numeric points for the current rank
         */
        ratingPoints?: number;

        /**
         * Total number of entries written
         */
        entryCount?: number;

        /**
         * Number of users following this user
         */
        followerCount?: number;

        /**
         * Number of users this user is following
         */
        followingCount?: number;
    };

    /**
     * Additional profile metadata
     */
    meta?: {
        /**
         * Whether profile is private
         */
        isPrivate?: boolean;

        /**
         * User's customized profile description
         */
        description?: string;

        /**
         * Topics of interest
         */
        interests?: string[];

        /**
         * Last activity timestamp
         */
        lastActive?: number;
    };
}

/**
 * Interface for the User Profile Service
 */
export interface IUserProfileService {
    /**
     * Initialize the service
     */
    initialize(): Promise<void>;

    /**
     * Get user profile from cache if available
     * @param username Username to look up
     * @returns User profile or undefined if not in cache
     */
    getUserProfileFromCache(username: string): IUserProfile | undefined;

    /**
     * Fetch user profile from server
     * @param username Username to fetch
     * @param force Force refresh even if cached
     * @returns Promise resolving to user profile
     */
    fetchUserProfile(username: string, force?: boolean): Promise<IUserProfile>;

    /**
     * Clear profile cache
     */
    clearCache(): void;

    /**
     * Clean up resources
     */
    destroy(): void;
}