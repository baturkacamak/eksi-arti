/**
 * Enum defining different storage areas that can be used for data persistence
 */
export enum StorageArea {
    /**
     * SYNC storage (chrome.storage.sync)
     * - Data is synchronized across user's devices where they're signed in with the same Google account
     * - Limited to ~100KB of data per item (subject to Chrome's limits)
     * - Good for small user preferences and settings that should follow the user
     * - May have slower performance than LOCAL storage
     * - Has daily write operation quota limits (~1800 operations/day)
     */
    SYNC = 'sync',

    /**
     * LOCAL storage (chrome.storage.local)
     * - Data is stored only on the current device
     * - Can store larger amounts of data (up to 5MB per extension)
     * - Good for device-specific data or larger datasets
     * - Generally faster than SYNC storage
     * - No synchronization between devices
     */
    LOCAL = 'local',

    /**
     * MEMORY storage (in-memory Map object)
     * - Data is stored only in memory during the current browser session
     * - Data is lost when the extension is reloaded or browser is closed
     * - Extremely fast access
     * - Used primarily as a fallback when other storage methods fail
     * - Good for temporary caching or when persistence is not critical
     */
    MEMORY = 'memory'
}

// Storage operation result
export interface StorageResult<T> {
    success: boolean;
    data?: T;
    source?: StorageArea;
    error?: Error;
}
export interface IStorageService {
    getItem<T>(key: string, defaultValue?: T, area?: StorageArea): Promise<StorageResult<T>>;
    setItem<T>(key: string, value: T, area?: StorageArea): Promise<StorageResult<void>>;
    removeItem(key: string, area?: StorageArea): Promise<StorageResult<void>>;
    clear(area?: StorageArea): Promise<StorageResult<void>>;
    getAllItems(area?: StorageArea): Promise<StorageResult<Record<string, any>>>;
    getAvailableStorage(): Promise<{ local: boolean; sync: boolean; session: boolean }>;
    instance: IStorageService;
}
