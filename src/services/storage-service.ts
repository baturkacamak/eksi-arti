/**
 * Combined Storage Service
 * Provides unified storage operations with fallbacks
 */

import { logger, logDebug, logError, logInfo, logWarn } from './logging-service';

// Storage areas
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

export class StorageService {
    private static instance: StorageService;
    private memoryStorage: Map<string, any> = new Map();
    private isDebugEnabled: boolean = false;

    private constructor() {
        // Initialize debug mode
        try {
            const preferences = localStorage.getItem('eksi_blocker_preferences');
            if (preferences) {
                const parsedPrefs = JSON.parse(preferences);
                this.isDebugEnabled = parsedPrefs.enableDebugMode || false;
                // Sync debug mode with logger
                logger.setDebugMode(this.isDebugEnabled);
            }
        } catch (error) {
            // Silently fail
        }

        logInfo('StorageService initialized', null, 'StorageService');
    }

    /**
     * Get the singleton instance
     */
    public static getInstance(): StorageService {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    /**
     * Original static save method (for backward compatibility)
     */
    public static save<T>(key: string, value: T): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [key]: value });
                // Also save to localStorage as fallback
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } else {
                // Fallback to localStorage for testing or non-extension environments
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            }
        } catch (e) {
            logError('Error saving to storage:', e);
            return false;
        }
    }

    /**
     * Original static load method (for backward compatibility)
     */
    public static load<T>(key: string, defaultValue: T | null = null): T | null {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // This is asynchronous and requires a callback or Promise approach
                // For simplicity, we'll still use localStorage in this example
                // In a real extension, we'd use chrome.storage.local.get
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } else {
                // Fallback to localStorage
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            }
        } catch (e) {
            logError('Error loading from storage:', e);
            return defaultValue;
        }
    }

    /**
     * Original static remove method (for backward compatibility)
     */
    public static remove(key: string): boolean {
        try {
            // For Chrome extension, use chrome.storage.local when available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(key);
                // Also remove from localStorage
                localStorage.removeItem(key);
                return true;
            } else {
                // Fallback to localStorage
                localStorage.removeItem(key);
                return true;
            }
        } catch (e) {
            logError('Error removing from storage:', e);
            return false;
        }
    }

    /**
     * Set debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.isDebugEnabled = enabled;
        // Also update the logger's debug mode
        logger.setDebugMode(enabled);
    }

    /**
     * Check if Chrome Storage is available
     */
    private isChromeStorageAvailable(area: StorageArea = StorageArea.SYNC): boolean {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            return false;
        }

        if (area === StorageArea.SYNC) {
            return !!chrome.storage.sync;
        } else if (area === StorageArea.LOCAL) {
            return !!chrome.storage.local;
        }

        return false;
    }

    /**
     * Save item to storage
     * Uses Chrome Storage API with fallbacks to localStorage and memory
     */
    public async setItem<T>(key: string, value: T, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<T>> {
        try {
            // Create data object
            const data = { [key]: value };

            // First, try Chrome Storage API (sync or local)
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.set(data, () => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome sync storage error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.set(data, () => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorage(key, value, resolve);
                                        } else {
                                            this.logDebug(`Saved to Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL, data: value });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorage(key, value, resolve);
                                }
                            } else {
                                this.logDebug(`Saved to Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC, data: value });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.set(data, () => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome local storage error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorage(key, value, resolve);
                            } else {
                                this.logDebug(`Saved to Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL, data: value });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorage(key, value, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorage(key, value);
            }
        } catch (error) {
            this.logError('Error in setItem:', error);

            // Final fallback to memory storage
            this.memoryStorage.set(key, value);
            return {
                success: true,
                source: StorageArea.MEMORY,
                data: value,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage
     */
    private fallbackToLocalStorage<T>(
        key: string,
        value: T,
        resolve?: (result: StorageResult<T>) => void
    ): StorageResult<T> | Promise<StorageResult<T>> {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            this.logDebug(`Saved to localStorage: ${key}`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea, data: value };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.logError('localStorage error:', error);

            // Final fallback to memory storage
            this.memoryStorage.set(key, value);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                data: value,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }

    /**
     * Get item from storage
     * Tries Chrome Storage, then localStorage, then memory storage
     */
    public async getItem<T>(key: string, defaultValue?: T, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<T>> {
        try {
            // First try Chrome Storage API (sync or local)
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<T>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.get(key, (result) => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome sync storage error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.get(key, (localResult) => {
                                        if (chrome.runtime.lastError || !localResult || localResult[key] === undefined) {
                                            this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                        } else {
                                            this.logDebug(`Retrieved from Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL, data: localResult[key] });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                                }
                            } else if (!result || result[key] === undefined) {
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                            } else {
                                this.logDebug(`Retrieved from Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC, data: result[key] });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.get(key, (result) => {
                            if (chrome.runtime.lastError || !result || result[key] === undefined) {
                                this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                            } else {
                                this.logDebug(`Retrieved from Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL, data: result[key] });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageGet(key, defaultValue, resolve);
                    }
                });
            } else {
                // Fallback to localStorage or memory
                return this.fallbackToLocalStorageGet(key, defaultValue);
            }
        } catch (error) {
            this.logError('Error in getItem:', error);

            // Final fallback to memory storage
            const data = this.memoryStorage.has(key) ? this.memoryStorage.get(key) : defaultValue;
            return {
                success: true,
                source: StorageArea.MEMORY,
                data,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for get operations
     */
    private fallbackToLocalStorageGet<T>(
        key: string,
        defaultValue?: T,
        resolve?: (result: StorageResult<T>) => void
    ): StorageResult<T> | Promise<StorageResult<T>> {
        try {
            const item = localStorage.getItem(key);

            if (item !== null) {
                const parsedItem = JSON.parse(item) as T;
                this.logDebug(`Retrieved from localStorage: ${key}`);

                const result = { success: true, source: StorageArea.LOCAL as StorageArea, data: parsedItem };
                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                // Try memory storage
                if (this.memoryStorage.has(key)) {
                    const memoryValue = this.memoryStorage.get(key);
                    this.logDebug(`Retrieved from memory storage: ${key}`);

                    const result = { success: true, source: StorageArea.MEMORY, data: memoryValue };
                    if (resolve) {
                        resolve(result);
                        return Promise.resolve(result);
                    }
                    return result;
                } else {
                    // Return default value if provided
                    const result = {
                        success: false,
                        source: undefined,
                        data: defaultValue,
                        error: new Error(`Item not found: ${key}`)
                    };

                    if (resolve) {
                        resolve(result);
                        return Promise.resolve(result);
                    }
                    return result;
                }
            }
        } catch (error) {
            this.logError('localStorage get error:', error);

            // Final fallback to memory storage
            if (this.memoryStorage.has(key)) {
                const data = this.memoryStorage.get(key);
                this.logDebug(`Retrieved from memory storage after localStorage failed: ${key}`);

                const result = { success: true, source: StorageArea.MEMORY, data };
                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            } else {
                const result = {
                    success: false,
                    source: undefined,
                    data: defaultValue,
                    error: error instanceof Error ? error : new Error(String(error))
                };

                if (resolve) {
                    resolve(result);
                    return Promise.resolve(result);
                }
                return result;
            }
        }
    }

    /**
     * Remove item from storage
     */
    public async removeItem(key: string, area: StorageArea = StorageArea.SYNC): Promise<StorageResult<void>> {
        try {
            // First try Chrome Storage API
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.remove(key, () => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome sync storage remove error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.remove(key, () => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorageRemove(key, resolve);
                                        } else {
                                            this.logDebug(`Removed from Chrome local storage after sync failed: ${key}`);
                                            resolve({ success: true, source: StorageArea.LOCAL });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageRemove(key, resolve);
                                }
                            } else {
                                this.logDebug(`Removed from Chrome sync storage: ${key}`);
                                resolve({ success: true, source: StorageArea.SYNC });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.remove(key, () => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome local storage remove error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorageRemove(key, resolve);
                            } else {
                                this.logDebug(`Removed from Chrome local storage: ${key}`);
                                resolve({ success: true, source: StorageArea.LOCAL });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageRemove(key, resolve);
                    }
                });
            } else {
                // Fallback to localStorage
                return this.fallbackToLocalStorageRemove(key);
            }
        } catch (error) {
            this.logError('Error in removeItem:', error);

            // Try to remove from memory storage anyway
            this.memoryStorage.delete(key);
            return {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for remove operations
     */
    private fallbackToLocalStorageRemove(
        key: string,
        resolve?: (result: StorageResult<void>) => void
    ): StorageResult<void> | Promise<StorageResult<void>> {
        try {
            localStorage.removeItem(key);
            this.memoryStorage.delete(key); // Also remove from memory
            this.logDebug(`Removed from localStorage: ${key}`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.logError('localStorage remove error:', error);

            // Final fallback to memory storage
            this.memoryStorage.delete(key);
            this.logDebug(`Removed from memory storage after localStorage failed: ${key}`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }

    /**
     * Clear all stored data
     */
    public async clear(area: StorageArea = StorageArea.SYNC): Promise<StorageResult<void>> {
        try {
            // First try Chrome Storage API
            if (this.isChromeStorageAvailable(area)) {
                return new Promise<StorageResult<void>>((resolve) => {
                    if (area === StorageArea.SYNC && chrome.storage.sync) {
                        chrome.storage.sync.clear(() => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome sync storage clear error:`, chrome.runtime.lastError);

                                // If sync fails, try local storage
                                if (this.isChromeStorageAvailable(StorageArea.LOCAL)) {
                                    chrome.storage.local.clear(() => {
                                        if (chrome.runtime.lastError) {
                                            this.fallbackToLocalStorageClear(resolve);
                                        } else {
                                            this.logDebug(`Cleared Chrome local storage after sync failed`);
                                            resolve({ success: true, source: StorageArea.LOCAL });
                                        }
                                    });
                                } else {
                                    this.fallbackToLocalStorageClear(resolve);
                                }
                            } else {
                                this.logDebug(`Cleared Chrome sync storage`);
                                resolve({ success: true, source: StorageArea.SYNC });
                            }
                        });
                    } else if (area === StorageArea.LOCAL && chrome.storage.local) {
                        chrome.storage.local.clear(() => {
                            if (chrome.runtime.lastError) {
                                this.logError(`Chrome local storage clear error:`, chrome.runtime.lastError);
                                this.fallbackToLocalStorageClear(resolve);
                            } else {
                                this.logDebug(`Cleared Chrome local storage`);
                                resolve({ success: true, source: StorageArea.LOCAL });
                            }
                        });
                    } else {
                        this.fallbackToLocalStorageClear(resolve);
                    }
                });
            } else {
                // Fallback to localStorage
                return this.fallbackToLocalStorageClear();
            }
        } catch (error) {
            this.logError('Error in clear:', error);

            // Try to clear memory storage anyway
            this.memoryStorage.clear();
            return {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Fallback to localStorage for clear operations
     */
    private fallbackToLocalStorageClear(
        resolve?: (result: StorageResult<void>) => void
    ): StorageResult<void> | Promise<StorageResult<void>> {
        try {
            localStorage.clear();
            this.memoryStorage.clear(); // Also clear memory
            this.logDebug(`Cleared localStorage`);

            const result = { success: true, source: StorageArea.LOCAL as StorageArea };
            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        } catch (error) {
            this.logError('localStorage clear error:', error);

            // Final fallback to memory storage
            this.memoryStorage.clear();
            this.logDebug(`Cleared memory storage after localStorage failed`);

            const result = {
                success: true,
                source: StorageArea.MEMORY,
                error: error instanceof Error ? error : new Error(String(error))
            };

            if (resolve) {
                resolve(result);
                return Promise.resolve(result);
            }
            return result;
        }
    }

    /**
     * Debug logging
     */
    private logDebug(message: string, data?: any) {
        if (this.isDebugEnabled) {
            logDebug(message, data, 'StorageService');
        }
    }

    /**
     * Info logging
     */
    private logInfo(message: string, data?: any) {
        logInfo(message, data, 'StorageService');
    }

    /**
     * Warning logging
     */
    private logWarn(message: string, data?: any) {
        logWarn(message, data, 'StorageService');
    }

    /**
     * Error logging
     */
    private logError(message: string, error?: any) {
        logError(message, error, 'StorageService');
    }
}

// Export singleton instance for enhanced usage
export const storageService = StorageService.getInstance();
